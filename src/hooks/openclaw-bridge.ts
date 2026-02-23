import type { PluginInput } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "fs"
import { basename, join } from "path"

/**
 * openclaw-bridge hook
 *
 * 监听 OpenCode session 事件，通过 OpenClaw Webhook API 唤醒 AI agent。
 * 支持事件：
 * - question / permission（输入阻塞）
 * - session.idle（完成）
 * - session.error（失败）
 *
 * 路由策略：优先按 session/workspace 解析目标 OpenClaw session，找不到再回退默认。
 */

interface OpenClawBridgeConfig {
  gatewayUrl?: string
  hookToken?: string
  notificationsDir?: string
  idleConfirmationDelay?: number
  target_session?: string
  sessionRoutesFile?: string
}

type SessionRouteFile = {
  bySession?: Record<string, string>
  byWorkspace?: Record<string, string>
}

const HARDCODED_DEFAULTS: Required<OpenClawBridgeConfig> = {
  gatewayUrl: "http://127.0.0.1:18789",
  hookToken: "openclaw-hook-bridge-2026",
  notificationsDir: "/Volumes/外置硬盘/OpenClaw/workspace/opencode/notifications",
  idleConfirmationDelay: 2000,
  target_session: "",
  sessionRoutesFile: "/Volumes/外置硬盘/OpenClaw/workspace/opencode/notifications/session-routes.json",
}

/** 从外部 config.json 加载配置，支持多个候选路径 */
function loadExternalConfig(): Partial<OpenClawBridgeConfig> {
  const candidatePaths = [
    // oh-my-opencode 项目根目录的专属配置
    join(process.cwd(), "openclaw-bridge.config.json"),
    // opencode-pilot skill 的通用配置
    "/Volumes/外置硬盘/OpenClaw/main-workspace/skills/opencode-pilot/scripts/config.json",
    // 用户 home 目录
    join(process.env.HOME || "~", ".config/openclaw/bridge.json"),
  ]

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      try {
        const raw = JSON.parse(readFileSync(p, "utf-8"))
        // opencode-pilot config.json 的结构是嵌套的，需要展平
        const gw = raw.openclaw_gateway || {}
        const notif = raw.notifications || {}
        const result: Partial<OpenClawBridgeConfig> = {}
        if (gw.url) result.gatewayUrl = gw.url
        if (gw.hook_token) result.hookToken = gw.hook_token
        if (gw.idle_confirmation_delay_ms) result.idleConfirmationDelay = gw.idle_confirmation_delay_ms
        if (gw.target_session) result.target_session = gw.target_session
        if (gw.session_routes_file) result.sessionRoutesFile = gw.session_routes_file
        if (notif.output_dir) result.notificationsDir = notif.output_dir
        // 也支持直接平铺格式（openclaw-bridge.config.json）
        if (raw.gatewayUrl) result.gatewayUrl = raw.gatewayUrl
        if (raw.hookToken) result.hookToken = raw.hookToken
        if (raw.target_session) result.target_session = raw.target_session
        if (raw.notificationsDir) result.notificationsDir = raw.notificationsDir
        if (raw.idleConfirmationDelay) result.idleConfirmationDelay = raw.idleConfirmationDelay
        if (raw.sessionRoutesFile) result.sessionRoutesFile = raw.sessionRoutesFile
        return result
      } catch (_) {
        // 解析失败跳过
      }
    }
  }
  return {}
}

function resolveConfig(override: OpenClawBridgeConfig = {}): Required<OpenClawBridgeConfig> {
  const external = loadExternalConfig()
  const merged = { ...HARDCODED_DEFAULTS, ...external, ...override }
  if (!merged.sessionRoutesFile) {
    merged.sessionRoutesFile = join(merged.notificationsDir, "session-routes.json")
  }
  return merged
}

function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const t = value.trim()
  return t.length > 0 ? t : undefined
}

function getSessionID(properties: Record<string, unknown> | undefined): string | undefined {
  const direct = trimToUndefined(properties?.sessionID) || trimToUndefined(properties?.sessionId)
  if (direct) return direct

  const info = properties?.info as Record<string, unknown> | undefined
  return trimToUndefined(info?.sessionID) || trimToUndefined(info?.sessionId) || trimToUndefined(info?.id)
}

function getRequestID(properties: Record<string, unknown> | undefined): string | undefined {
  return (
    trimToUndefined(properties?.requestID) ||
    trimToUndefined(properties?.requestId) ||
    trimToUndefined(properties?.permissionID) ||
    trimToUndefined(properties?.permissionId) ||
    trimToUndefined(properties?.id)
  )
}

function getPermissionTool(properties: Record<string, unknown> | undefined): string | undefined {
  return trimToUndefined(properties?.tool) || trimToUndefined(properties?.name)
}

function parseQuestionItems(properties: Record<string, unknown> | undefined): Array<{ title: string; options: string[] }> {
  const directQuestions = properties?.questions
  const args = properties?.args as Record<string, unknown> | undefined
  const argQuestions = args?.questions

  const source = Array.isArray(directQuestions)
    ? directQuestions
    : Array.isArray(argQuestions)
      ? argQuestions
      : []

  return source
    .map((q) => {
      const qq = (q ?? {}) as Record<string, unknown>
      const title =
        trimToUndefined(qq.header) ||
        trimToUndefined(qq.question) ||
        trimToUndefined(qq.text) ||
        "（未提供问题文本）"

      const options = Array.isArray(qq.options)
        ? qq.options
            .map((o) => {
              const oo = (o ?? {}) as Record<string, unknown>
              return trimToUndefined(oo.label) || trimToUndefined(oo.value) || ""
            })
            .filter((s) => s.length > 0)
        : []

      return { title, options }
    })
    .filter((q) => q.title.length > 0)
}

function readSessionRoutes(filePath: string): SessionRouteFile {
  try {
    if (!existsSync(filePath)) return {}
    const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as SessionRouteFile
    return typeof parsed === "object" && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function resolveTargetSession(config: Required<OpenClawBridgeConfig>, workspace: string, sessionId?: string): string | undefined {
  // 1) 明确配置优先
  const fixed = trimToUndefined(config.target_session)
  if (fixed) return fixed

  // 2) 环境变量兜底
  const envSession = trimToUndefined(process.env.OPENCLAW_TARGET_SESSION) || trimToUndefined(process.env.OPENCLAW_SESSION_KEY)
  if (envSession) return envSession

  // 3) 文件路由（支持 workspace + session）
  const routes = readSessionRoutes(config.sessionRoutesFile)
  const bySession = routes.bySession || {}
  const byWorkspace = routes.byWorkspace || {}

  if (sessionId) {
    const compositeKey = `${workspace}::${sessionId}`
    const exact = trimToUndefined(bySession[compositeKey])
    if (exact) return exact

    const plain = trimToUndefined(bySession[sessionId])
    if (plain) return plain
  }

  const workspaceExact = trimToUndefined(byWorkspace[workspace])
  if (workspaceExact) return workspaceExact

  const workspaceBase = trimToUndefined(byWorkspace[basename(workspace)])
  if (workspaceBase) return workspaceBase

  return undefined
}

function resolveWorkspace(ctx: PluginInput): string {
  return (
    trimToUndefined((ctx.project as { worktree?: string } | undefined)?.worktree) ||
    trimToUndefined(ctx.directory) ||
    process.cwd()
  )
}

const QUESTION_EVENTS = new Set([
  "question.ask",
  "question.asked",
  "question.requested",
])

const PERMISSION_EVENTS = new Set([
  "permission.ask",
  "permission.asked",
  "permission.requested",
  "permission.updated",
])

const QUESTION_TOOLS = new Set(["question", "ask_user_question", "askuserquestion"])

// 跟踪 session 状态
const sessionStates = new Map<string, {
  status: string
  title: string
  agent: string
  workspace: string
  parentID?: string          // 有 parentID = 子 session，不触发 wake
  targetSession?: string
  lastActivity: number
  idleTimer: ReturnType<typeof setTimeout> | null
}>()

/**
 * 通过 OpenClaw Webhook API 唤醒 AI agent
 * POST /hooks/wake { text, mode: "now", session? }
 */
async function wakeOpenClaw(
  config: Required<OpenClawBridgeConfig>,
  text: string,
  targetSession?: string
): Promise<boolean> {
  try {
    const url = `${config.gatewayUrl}/hooks/wake`
    const payload: { text: string; mode: string; session?: string } = { text, mode: "now" }
    if (targetSession) {
      payload.session = targetSession
    }
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.hookToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 写文件通知（备用 + 状态记录）
 */
async function writeNotification(
  config: Required<OpenClawBridgeConfig>,
  eventType: string,
  data: Record<string, unknown>
) {
  const notification = { timestamp: new Date().toISOString(), event: eventType, ...data }

  try {
    const fs = await import("fs")
    const path = await import("path")

    fs.mkdirSync(config.notificationsDir, { recursive: true })

    fs.writeFileSync(
      path.join(config.notificationsDir, "latest.json"),
      JSON.stringify(notification, null, 2)
    )

    if (["session.idle", "session.error", "question.asked", "permission.asked"].includes(eventType)) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const sid = String(data.sessionId || "unknown").slice(0, 12)
      const filename = `${ts}_${eventType.replace(".", "_")}_${sid}.json`
      fs.writeFileSync(
        path.join(config.notificationsDir, filename),
        JSON.stringify(notification, null, 2)
      )
    }
  } catch {
    // 文件写入失败不阻塞
  }
}

function buildQuestionWakeText(params: {
  workspace: string
  sessionId: string
  requestId?: string
  questions: Array<{ title: string; options: string[] }>
}) {
  const lines: string[] = []
  lines.push(
    `[OpenCode Question] workspace="${params.workspace}" session=${params.sessionId}${params.requestId ? ` request=${params.requestId}` : ""}`
  )
  if (params.questions.length === 0) {
    lines.push("问题内容：未提供。请读取 session 消息并向用户确认后回复。")
    return lines.join("\n")
  }

  for (let i = 0; i < Math.min(params.questions.length, 3); i++) {
    const q = params.questions[i]
    lines.push(`Q${i + 1}: ${q.title}`)
    if (q.options.length > 0) {
      lines.push(`选项: ${q.options.slice(0, 8).join(" | ")}`)
    }
  }
  lines.push("请把问题转发给用户，收到回复后调用 question reply。")
  return lines.join("\n")
}

function buildPermissionWakeText(params: {
  workspace: string
  sessionId: string
  requestId?: string
  tool?: string
}) {
  return [
    `[OpenCode Permission] workspace="${params.workspace}" session=${params.sessionId}${params.requestId ? ` request=${params.requestId}` : ""}`,
    params.tool ? `工具: ${params.tool}` : "工具: 未提供",
    "请向用户确认允许/拒绝，并调用 permission reply。",
  ].join("\n")
}

export function createOpenClawBridge(
  ctx: PluginInput,
  config: OpenClawBridgeConfig = {}
) {
  const c = resolveConfig(config)
  const workspace = resolveWorkspace(ctx)

  const eventHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.created") {
      const info = props?.info as Record<string, unknown> | undefined
      const sessionId = info?.id as string | undefined
      if (sessionId) {
        const parentID = info?.parentID as string | undefined
        const targetSession = resolveTargetSession(c, workspace, sessionId)
        sessionStates.set(sessionId, {
          status: "created",
          title: (info?.title as string) || "",
          agent: "",
          workspace,
          parentID: parentID || undefined,
          targetSession,
          lastActivity: Date.now(),
          idleTimer: null,
        })
        await writeNotification(c, "session.created", {
          sessionId,
          title: info?.title || "",
          parentID: parentID || "",
          workspace,
          targetSession,
        })
      }
      return
    }

    const sessionId = getSessionID(props)
    const stateTargetSession = sessionId ? sessionStates.get(sessionId)?.targetSession : undefined
    const targetSession = stateTargetSession || resolveTargetSession(c, workspace, sessionId)

    // 子 session（有 parentID）不触发 wakeOpenClaw，只写文件通知
    // 子 session 完成后主 session 会自动继续，无需打扰用户
    const isChildSession = (() => {
      if (sessionId) {
        const state = sessionStates.get(sessionId)
        if (state?.parentID) return true
      }
      // 也检查事件 properties 里的 parentID（兜底）
      const info = props?.info as Record<string, unknown> | undefined
      if (info?.parentID) return true
      if (props?.parentID) return true
      return false
    })()

    // Question（显式事件）
    if (QUESTION_EVENTS.has(event.type) && sessionId) {
      const requestId = getRequestID(props)
      const questions = parseQuestionItems(props)
      const text = buildQuestionWakeText({ workspace, sessionId, requestId, questions })

      await writeNotification(c, "question.asked", {
        sessionId,
        workspace,
        requestId,
        targetSession,
        isChild: isChildSession,
        questions,
      })
      // 子 session 的 question 由主 agent 自行处理，不打扰用户
      if (!isChildSession) {
        await wakeOpenClaw(c, text, targetSession)
      }
      return
    }

    // Permission（显式事件）
    if (PERMISSION_EVENTS.has(event.type) && sessionId) {
      const requestId = getRequestID(props)
      const tool = getPermissionTool(props)
      const text = buildPermissionWakeText({ workspace, sessionId, requestId, tool })

      await writeNotification(c, "permission.asked", {
        sessionId,
        workspace,
        requestId,
        tool,
        targetSession,
        isChild: isChildSession,
      })
      // 子 session 的 permission 由主 agent 自行处理
      if (!isChildSession) {
        await wakeOpenClaw(c, text, targetSession)
      }
      return
    }

    // Question（通过工具调用触发）
    if (event.type === "tool.execute.before" && sessionId) {
      const toolName = (getPermissionTool(props) || "").toLowerCase()
      if (QUESTION_TOOLS.has(toolName)) {
        const requestId = getRequestID(props)
        const questions = parseQuestionItems(props)
        const text = buildQuestionWakeText({ workspace, sessionId, requestId, questions })

        await writeNotification(c, "question.asked", {
          sessionId,
          workspace,
          requestId,
          targetSession,
          isChild: isChildSession,
          tool: toolName,
          questions,
        })
        if (!isChildSession) {
          await wakeOpenClaw(c, text, targetSession)
        }
      }
      return
    }

    if (event.type === "session.idle") {
      if (!sessionId) return

      const state = sessionStates.get(sessionId)
      if (state?.idleTimer) clearTimeout(state.idleTimer)

      // 子 session idle 不唤醒用户，只写文件记录
      if (isChildSession) {
        if (state) state.status = "idle"
        await writeNotification(c, "session.idle", {
          sessionId,
          title: state?.title || "",
          agent: state?.agent || "",
          workspace: state?.workspace || workspace,
          targetSession,
          isChild: true,
        })
        return
      }

      // 主 session：延迟确认 idle（避免短暂 idle 误报）
      const timer = setTimeout(async () => {
        const s = sessionStates.get(sessionId)
        if (s) s.status = "idle"

        const title = s?.title || ""
        const agent = s?.agent || ""
        const stateWorkspace = s?.workspace || workspace
        const stateTarget = s?.targetSession || targetSession

        await writeNotification(c, "session.idle", {
          sessionId,
          title,
          agent,
          workspace: stateWorkspace,
          targetSession: stateTarget,
        })

        await wakeOpenClaw(
          c,
          `[OpenCode 任务完成] workspace="${stateWorkspace}" session=${sessionId} title="${title}" agent=${agent} — 请查看结果并通知用户。`,
          stateTarget
        )
      }, c.idleConfirmationDelay)

      if (state) state.idleTimer = timer
      return
    }

    if (event.type === "session.error") {
      if (!sessionId) return

      const state = sessionStates.get(sessionId)
      if (state) {
        state.status = "error"
        if (state.idleTimer) clearTimeout(state.idleTimer)
      }

      const error = typeof props?.error === "object" ? JSON.stringify(props.error) : String(props?.error || "unknown error")
      const stateWorkspace = state?.workspace || workspace
      const stateTarget = state?.targetSession || targetSession

      await writeNotification(c, "session.error", {
        sessionId,
        error,
        workspace: stateWorkspace,
        targetSession: stateTarget,
        isChild: isChildSession,
      })

      // 子 session error 不打扰用户，主 agent 会处理
      if (!isChildSession) {
        await wakeOpenClaw(
          c,
          `[OpenCode 错误] workspace="${stateWorkspace}" session=${sessionId} error="${error}" — 请检查并处理。`,
          stateTarget
        )
      }
      return
    }

    if (event.type === "message.updated") {
      const info = props?.info as Record<string, unknown> | undefined
      const messageSessionId = info?.sessionID as string | undefined
      const agent = info?.agent as string | undefined

      if (messageSessionId) {
        const state = sessionStates.get(messageSessionId)
        if (state) {
          state.lastActivity = Date.now()
          state.status = "running"
          if (agent) state.agent = agent
          if (state.idleTimer) {
            clearTimeout(state.idleTimer)
            state.idleTimer = null
          }
        }
      }
      return
    }

    if (event.type === "tool.execute.before") {
      if (sessionId) {
        const state = sessionStates.get(sessionId)
        if (state) {
          state.lastActivity = Date.now()
          if (state.idleTimer) {
            clearTimeout(state.idleTimer)
            state.idleTimer = null
          }
        }
      }
      return
    }

    if (event.type === "session.deleted") {
      const info = props?.info as { id?: string } | undefined
      if (info?.id) {
        const state = sessionStates.get(info.id)
        if (state?.idleTimer) clearTimeout(state.idleTimer)
        sessionStates.delete(info.id)
      }
      return
    }
  }

  return { event: eventHandler }
}
