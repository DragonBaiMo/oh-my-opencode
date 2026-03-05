import type { HookDeps } from "./types"
import { HOOK_NAME } from "./constants"
import { log } from "../../shared/logger"
import { normalizeAgentName, resolveAgentForSession } from "./agent-resolver"
import { clearRuntimeFallbackRetry, getSessionAgent, markRuntimeFallbackRetry } from "../../features/claude-code-session-state"
import { getAgentConfigKey } from "../../shared/agent-display-names"
import { getFallbackModelsForSession } from "./fallback-models"
import { prepareFallback } from "./fallback-state"
import { SessionCategoryRegistry } from "../../shared/session-category-registry"
import { isGptModel } from "../../agents/types"

const SESSION_TTL_MS = 30 * 60 * 1000
const RETRY_DEBOUNCE_MS = 3000

declare function setTimeout(callback: () => void | Promise<void>, delay?: number): ReturnType<typeof globalThis.setTimeout>
declare function clearTimeout(timeout: ReturnType<typeof globalThis.setTimeout>): void

export function createAutoRetryHelpers(deps: HookDeps) {
  const { ctx, config, options, sessionStates, sessionLastAccess, sessionRetryInFlight, sessionAwaitingFallbackResult, sessionFallbackTimeouts, pluginConfig } = deps
  const sessionLastRetryAt = new Map<string, number>()
  const sessionLastRetryModel = new Map<string, string>()

  const abortSessionRequest = async (sessionID: string, source: string): Promise<void> => {
    try {
      await ctx.client.session.abort({ path: { id: sessionID } })
      log(`[${HOOK_NAME}] Aborted in-flight session request (${source})`, { sessionID })
    } catch (error) {
      log(`[${HOOK_NAME}] Failed to abort in-flight session request (${source})`, {
        sessionID,
        error: String(error),
      })
    }
  }

  const clearSessionFallbackTimeout = (sessionID: string) => {
    const timer = sessionFallbackTimeouts.get(sessionID)
    if (timer) {
      clearTimeout(timer)
      sessionFallbackTimeouts.delete(sessionID)
    }
  }

  const scheduleSessionFallbackTimeout = (sessionID: string, resolvedAgent?: string) => {
    clearSessionFallbackTimeout(sessionID)

    const timeoutMs = options?.session_timeout_ms ?? config.timeout_seconds * 1000
    if (timeoutMs <= 0) return

    const timer = setTimeout(async () => {
      sessionFallbackTimeouts.delete(sessionID)

      const state = sessionStates.get(sessionID)
      if (!state) return

      if (sessionRetryInFlight.has(sessionID)) {
        log(`[${HOOK_NAME}] Overriding in-flight retry due to session timeout`, { sessionID })
      }

      await abortSessionRequest(sessionID, "session.timeout")
      sessionRetryInFlight.delete(sessionID)

      if (state.pendingFallbackModel) {
        state.pendingFallbackModel = undefined
      }

      const fallbackModels = getFallbackModelsForSession(sessionID, resolvedAgent, pluginConfig)
      if (fallbackModels.length === 0) return

      log(`[${HOOK_NAME}] Session fallback timeout reached`, {
        sessionID,
        timeoutSeconds: config.timeout_seconds,
        currentModel: state.currentModel,
      })

      const result = prepareFallback(sessionID, state, fallbackModels, config)
      if (result.success && result.newModel) {
        await autoRetryWithFallback(sessionID, result.newModel, resolvedAgent, "session.timeout")
      }
    }, timeoutMs)

    sessionFallbackTimeouts.set(sessionID, timer)
  }

  const autoRetryWithFallback = async (
    sessionID: string,
    newModel: string,
    resolvedAgent: string | undefined,
    source: string,
  ): Promise<void> => {
    if (sessionRetryInFlight.has(sessionID)) {
      log(`[${HOOK_NAME}] Retry already in flight, skipping (${source})`, { sessionID })
      return
    }

    const lastRetryAt = sessionLastRetryAt.get(sessionID)
    const lastModel = sessionLastRetryModel.get(sessionID)
    if (
      source !== "session.timeout"
      && lastRetryAt
      && Date.now() - lastRetryAt < RETRY_DEBOUNCE_MS
      && lastModel === newModel
    ) {
      log(`[${HOOK_NAME}] Retry debounced to avoid duplicate runs (${source})`, {
        sessionID,
        elapsedMs: Date.now() - lastRetryAt,
        model: newModel,
      })
      return
    }

    const modelParts = newModel.split("/")
    if (modelParts.length < 2) {
      log(`[${HOOK_NAME}] Invalid model format (missing provider prefix): ${newModel}`)
      const state = sessionStates.get(sessionID)
      if (state?.pendingFallbackModel) {
        state.pendingFallbackModel = undefined
      }
      return
    }

    const fallbackModelObj = {
      providerID: modelParts[0],
      modelID: modelParts.slice(1).join("/"),
    }

    sessionRetryInFlight.add(sessionID)
    let retryDispatched = false
    try {
      log(`[${HOOK_NAME}] Auto-retrying with fallback model (${source})`, {
        sessionID,
        model: newModel,
      })

      const shouldSwitchAgent = config.strategy === "agent" || config.strategy === "both"
      const sessionStoredAgent = getSessionAgent(sessionID)
      const resolvedRetryAgentKey = resolvedAgent ?? sessionStoredAgent
      const normalizedRetryAgentKey = resolvedRetryAgentKey
        ? getAgentConfigKey(resolvedRetryAgentKey)
        : undefined
      const configuredDefaultAgent = typeof pluginConfig?.default_agent === "string"
        ? getAgentConfigKey(pluginConfig.default_agent)
        : undefined
      const stateModel = sessionStates.get(sessionID)?.originalModel
        ?? sessionStates.get(sessionID)?.currentModel
        ?? newModel
      const stateModelID = stateModel.split("/").slice(1).join("/")
      const inferredAgentByModel = isGptModel(stateModelID) ? "hephaestus" : "sisyphus"
      const retryAgentKey = normalizedRetryAgentKey ?? configuredDefaultAgent ?? inferredAgentByModel
      sessionAwaitingFallbackResult.add(sessionID)
      scheduleSessionFallbackTimeout(sessionID, retryAgentKey)

      // Keep continuation in current session; do not replay the original user request.
      // Replaying the full request can relaunch ULW batches and create many new runnings.
      const retryParts = [{ type: "text" as const, text: "continue" }]

      if (!shouldSwitchAgent) {
        markRuntimeFallbackRetry(sessionID)
      }

      await ctx.client.session.promptAsync({
        path: { id: sessionID },
        body: {
          agent: retryAgentKey,
          model: fallbackModelObj,
          parts: retryParts,
        },
        query: { directory: ctx.directory },
      })
      retryDispatched = true
      sessionLastRetryAt.set(sessionID, Date.now())
      sessionLastRetryModel.set(sessionID, newModel)
    } catch (retryError) {
      log(`[${HOOK_NAME}] Auto-retry failed (${source})`, { sessionID, error: String(retryError) })
    } finally {
      sessionRetryInFlight.delete(sessionID)
      if (!retryDispatched) {
        clearRuntimeFallbackRetry(sessionID)
        sessionAwaitingFallbackResult.delete(sessionID)
        clearSessionFallbackTimeout(sessionID)
        const state = sessionStates.get(sessionID)
        if (state?.pendingFallbackModel) {
          state.pendingFallbackModel = undefined
        }
      }
    }
  }

  const resolveAgentForSessionFromContext = async (
    sessionID: string,
    eventAgent?: string,
  ): Promise<string | undefined> => {
    const resolved = resolveAgentForSession(sessionID, eventAgent)
    if (resolved) return resolved

    try {
      const messagesResp = await ctx.client.session.messages({
        path: { id: sessionID },
        query: { directory: ctx.directory },
      })
      const msgs = (messagesResp as { data?: Array<{ info?: Record<string, unknown> }> }).data
      if (!msgs || msgs.length === 0) return undefined

      for (let i = msgs.length - 1; i >= 0; i--) {
        const info = msgs[i]?.info
        const infoAgent = typeof info?.agent === "string" ? info.agent : undefined
        const normalized = normalizeAgentName(infoAgent)
        if (normalized) {
          return normalized
        }
      }
    } catch {
      return undefined
    }

    return undefined
  }

  const cleanupStaleSessions = () => {
    const now = Date.now()
    let cleanedCount = 0
    for (const [sessionID, lastAccess] of sessionLastAccess.entries()) {
      if (now - lastAccess > SESSION_TTL_MS) {
        sessionStates.delete(sessionID)
        sessionLastAccess.delete(sessionID)
        sessionLastRetryAt.delete(sessionID)
        sessionLastRetryModel.delete(sessionID)
        sessionRetryInFlight.delete(sessionID)
        sessionAwaitingFallbackResult.delete(sessionID)
        clearSessionFallbackTimeout(sessionID)
        SessionCategoryRegistry.remove(sessionID)
        cleanedCount++
      }
    }
    if (cleanedCount > 0) {
      log(`[${HOOK_NAME}] Cleaned up ${cleanedCount} stale session states`)
    }
  }

  return {
    abortSessionRequest,
    clearSessionFallbackTimeout,
    scheduleSessionFallbackTimeout,
    autoRetryWithFallback,
    resolveAgentForSessionFromContext,
    cleanupStaleSessions,
  }
}

export type AutoRetryHelpers = ReturnType<typeof createAutoRetryHelpers>
