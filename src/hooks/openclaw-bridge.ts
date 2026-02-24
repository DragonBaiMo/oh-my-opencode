import type { PluginInput } from "@opencode-ai/plugin"
import { readFileSync, existsSync, writeFileSync } from "fs"
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
  questionTimeoutMs?: number
  autoReplyEnabled?: boolean
  opencodeBaseUrl?: string
  sessionRoutesFile?: string
}

type DeliveryRoute = {
  channel: string
  accountId: string
  target: string
}

type SessionRouteFile = {
  version?: number
  bySession?: Record<string, string>
  deliveryBySession?: Record<string, DeliveryRoute>
  // legacy (v1)
  byWorkspace?: Record<string, string>
}

const HARDCODED_DEFAULTS: Required<OpenClawBridgeConfig> = {
  gatewayUrl: "http://127.0.0.1:18789",
  hookToken: "openclaw-hook-bridge-2026",
  notificationsDir: "/Volumes/外置硬盘/OpenClaw/workspace/opencode/notifications",
  idleConfirmationDelay: 2000,
  questionTimeoutMs: 180000,
  autoReplyEnabled: true,
  opencodeBaseUrl: "http://127.0.0.1:4096",
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
        if (gw.question_timeout_ms) result.questionTimeoutMs = gw.question_timeout_ms
        if (typeof gw.auto_reply_enabled === "boolean") result.autoReplyEnabled = gw.auto_reply_enabled
        if (gw.opencode_base_url) result.opencodeBaseUrl = gw.opencode_base_url
        if (gw.session_routes_file) result.sessionRoutesFile = gw.session_routes_file
        if (notif.output_dir) result.notificationsDir = notif.output_dir
        if (raw.opencode?.base_port) result.opencodeBaseUrl = `http://127.0.0.1:${raw.opencode.base_port}`
        // 也支持直接平铺格式（openclaw-bridge.config.json）
        if (raw.gatewayUrl) result.gatewayUrl = raw.gatewayUrl
        if (raw.hookToken) result.hookToken = raw.hookToken
        if (raw.notificationsDir) result.notificationsDir = raw.notificationsDir
        if (raw.idleConfirmationDelay) result.idleConfirmationDelay = raw.idleConfirmationDelay
        if (raw.questionTimeoutMs) result.questionTimeoutMs = raw.questionTimeoutMs
        if (typeof raw.autoReplyEnabled === "boolean") result.autoReplyEnabled = raw.autoReplyEnabled
        if (raw.opencodeBaseUrl) result.opencodeBaseUrl = raw.opencodeBaseUrl
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

function persistSessionRoute(
  config: Required<OpenClawBridgeConfig>,
  workspace: string,
  sessionId: string,
  targetSession: string,
): boolean {
  const routes = readSessionRoutes(config.sessionRoutesFile)
  const bySession = routes.bySession || {}
  bySession[`${workspace}::${sessionId}`] = targetSession

  const next: SessionRouteFile = {
    version: 2,
    bySession,
    deliveryBySession: routes.deliveryBySession || {},
  }
  try {
    writeFileSync(config.sessionRoutesFile, JSON.stringify(next, null, 2))
    return true
  } catch {
    return false
  }
}

function resolveTargetSession(config: Required<OpenClawBridgeConfig>, workspace: string, sessionId?: string): string | undefined {
  // 1) 文件路由（v2 仅支持 workspace::sid；兼容读取旧 sid 裸键）
  const routes = readSessionRoutes(config.sessionRoutesFile)
  const bySession = routes.bySession || {}

  if (sessionId) {
    const compositeKey = `${workspace}::${sessionId}`
    const exact = trimToUndefined(bySession[compositeKey])
    if (exact) return exact

    // legacy fallback（仅读，不再写）
    const plain = trimToUndefined(bySession[sessionId])
    if (plain) return plain
  }

  // 2) 环境变量最终兜底
  const envSession = trimToUndefined(process.env.OPENCLAW_TARGET_SESSION) || trimToUndefined(process.env.OPENCLAW_SESSION_KEY)
  if (envSession) return envSession

  return undefined
}


function resolveRouteFromFileOnly(config: Required<OpenClawBridgeConfig>, workspace: string, sessionId?: string): string | undefined {
  if (!sessionId) return undefined
  const routes = readSessionRoutes(config.sessionRoutesFile)
  const bySession = routes.bySession || {}
  const compositeKey = `${workspace}::${sessionId}`
  return trimToUndefined(bySession[compositeKey]) || trimToUndefined(bySession[sessionId])
}

function resolveWorkspace(ctx: PluginInput): string {
  return (
    trimToUndefined((ctx.project as { worktree?: string } | undefined)?.worktree) ||
    trimToUndefined(ctx.directory) ||
    process.cwd()
  )
}

function getParentIDFromProps(properties: Record<string, unknown> | undefined): string | undefined {
  const info = properties?.info as Record<string, unknown> | undefined
  const infoParent = info?.parent as Record<string, unknown> | undefined
  return (
    trimToUndefined(info?.parentID) ||
    trimToUndefined(info?.parentId) ||
    trimToUndefined(info?.parent_id) ||
    trimToUndefined(infoParent?.id) ||
    trimToUndefined(properties?.parentID) ||
    trimToUndefined(properties?.parentId) ||
    trimToUndefined(properties?.parent_id)
  )
}

function safeJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
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

type PendingInteractionKind = "question" | "permission"

type PendingInteraction = {
  key: string
  kind: PendingInteractionKind
  sessionId: string
  requestId?: string
  workspace: string
  targetSession?: string
  createdAt: number
  timer: ReturnType<typeof setTimeout>
}

type RouteDecision = {
  targetSession?: string
  routeCorrected: boolean
}

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

const pendingInteractions = new Map<string, PendingInteraction>()
const pendingKeysBySession = new Map<string, Set<string>>()

function buildPendingKey(params: {
  kind: PendingInteractionKind
  sessionId: string
  requestId?: string
  tool?: string
  questions?: Array<{ title: string; options: string[] }>
}) {
  const requestPart = params.requestId
  if (requestPart) return `${params.kind}:${params.sessionId}:${requestPart}`

  if (params.kind === "permission") {
    const tool = params.tool || "unknown"
    return `${params.kind}:${params.sessionId}:tool:${tool}`
  }

  const firstQuestion = params.questions?.[0]?.title || "unknown"
  return `${params.kind}:${params.sessionId}:q:${firstQuestion.slice(0, 120)}`
}

function registerPendingForSession(sessionId: string, pendingKey: string) {
  const keys = pendingKeysBySession.get(sessionId) || new Set<string>()
  keys.add(pendingKey)
  pendingKeysBySession.set(sessionId, keys)
}

function clearPendingKey(pendingKey: string) {
  const pending = pendingInteractions.get(pendingKey)
  if (!pending) return
  clearTimeout(pending.timer)
  pendingInteractions.delete(pendingKey)
  const keys = pendingKeysBySession.get(pending.sessionId)
  if (!keys) return
  keys.delete(pendingKey)
  if (keys.size === 0) {
    pendingKeysBySession.delete(pending.sessionId)
  }
}

function clearPendingForSession(sessionId: string) {
  const keys = pendingKeysBySession.get(sessionId)
  if (!keys) return
  for (const key of [...keys]) {
    clearPendingKey(key)
  }
}

function resolveOpenCodeBaseUrl(ctx: PluginInput, config: Required<OpenClawBridgeConfig>): string {
  const rawServerUrl = (ctx as { serverUrl?: URL | string }).serverUrl
  if (rawServerUrl instanceof URL) {
    return rawServerUrl.origin
  }
  if (typeof rawServerUrl === "string" && rawServerUrl.trim().length > 0) {
    try {
      return new URL(rawServerUrl).origin
    } catch {
      return config.opencodeBaseUrl
    }
  }
  return config.opencodeBaseUrl
}

function extractSessionIdFromEvent(properties: Record<string, unknown> | undefined): string | undefined {
  const info = properties?.info as Record<string, unknown> | undefined
  return (
    trimToUndefined(info?.id) ||
    trimToUndefined(properties?.sessionID) ||
    trimToUndefined(properties?.sessionId) ||
    trimToUndefined((properties?.session as Record<string, unknown> | undefined)?.id)
  )
}

function looksLikeChildSessionFallback(props: Record<string, unknown> | undefined, stateAgent?: string): boolean {
  const titleCandidates = [
    trimToUndefined((props?.info as Record<string, unknown> | undefined)?.title),
    trimToUndefined(props?.title),
  ].filter((value): value is string => Boolean(value))
  const info = props?.info as Record<string, unknown> | undefined
  const runtimeAgent = trimToUndefined(info?.agent) || trimToUndefined(props?.agent)
  const text = `${titleCandidates.join(" ")} ${stateAgent || ""} ${runtimeAgent || ""}`.toLowerCase()
  return text.includes("subagent") || text.includes("sisyphus-junior")
}

function validateAndCorrectRoute(sessionId: string | undefined, resolvedTarget: string | undefined): RouteDecision {
  if (!sessionId) {
    return { targetSession: resolvedTarget, routeCorrected: false }
  }

  const state = sessionStates.get(sessionId)
  const remembered = trimToUndefined(state?.targetSession)
  const current = trimToUndefined(resolvedTarget)

  // v2 策略：routes(bySession) 才是当前真相。
  // 若内存态 remembered 与 routes 当前值冲突，优先采用 current，并标记 routeCorrected。
  if (remembered && current && remembered !== current) {
    return { targetSession: current, routeCorrected: true }
  }

  // 若 routes 暂时不可用（例如文件瞬时读失败），才回退 remembered。
  if (remembered && !current) {
    return { targetSession: remembered, routeCorrected: false }
  }

  return { targetSession: current, routeCorrected: false }
}

function buildUserNotificationText(params:
  | {
      kind: "question"
      workspace: string
      sessionId: string
      requestId?: string
      questions: Array<{ title: string; options: string[] }>
      timeoutMs: number
      routeCorrected: boolean
    }
  | {
      kind: "permission"
      workspace: string
      sessionId: string
      requestId?: string
      tool?: string
      timeoutMs: number
      routeCorrected: boolean
    }
): string {
  const minutes = Math.max(1, Math.round(params.timeoutMs / 60000))
  const header = params.kind === "question" ? "OpenCode 在等你回答问题" : "OpenCode 在请求权限确认"
  const lines = [
    header,
    `项目: ${basename(params.workspace)}`,
    `session: ${params.sessionId}`,
  ]
  if (params.requestId) {
    lines.push(`request: ${params.requestId}`)
  }
  if (params.routeCorrected) {
    lines.push("[ROUTE-CORRECTED] 已自动修正历史路由漂移")
  }

  if (params.kind === "question") {
    if (params.questions.length === 0) {
      lines.push("问题内容：未提供（请查看会话后直接回复）")
    } else {
      for (let i = 0; i < Math.min(params.questions.length, 3); i++) {
        const q = params.questions[i]
        lines.push(`Q${i + 1}: ${q.title}`)
        if (q.options.length > 0) {
          lines.push(`选项: ${q.options.map((o, idx) => `${idx + 1}.${o}`).join(" | ")}`)
        }
      }
    }
  } else {
    lines.push(params.tool ? `工具: ${params.tool}` : "工具: 未提供")
    lines.push("请回复 allow 或 deny")
  }

  lines.push(`请在 ${minutes} 分钟内回复；超时后将自动处理。`)
  return lines.join("\n")
}

function buildQuestionAutoReplyWakeText(params: {
  workspace: string
  sessionId: string
  requestId?: string
  questions: Array<{ title: string; options: string[] }>
  routeCorrected?: boolean
}) {
  const base = buildQuestionWakeText(params)
  const prefix = [
    "[AUTO-REPLY] 用户在 3 分钟内未回复，请自动代答。若之后用户晚到回复，请提示：该 request 可能已超时自动处理，不要重复 question reply。",
    params.routeCorrected ? "[ROUTE-CORRECTED] 已自动修正路由漂移（使用 routes 文件当前值）。" : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
  return `${prefix}\n${base}`
}

function buildPermissionAutoReplyWakeText(params: {
  workspace: string
  sessionId: string
  requestId?: string
  tool?: string
  routeCorrected?: boolean
}) {
  const base = buildPermissionWakeText(params)
  const prefix = [
    "[AUTO-REPLY] 用户在 3 分钟内未回复，请自动代答。若之后用户晚到回复，请先确认 permission 是否仍 pending，再决定是否回复。",
    params.routeCorrected ? "[ROUTE-CORRECTED] 已自动修正路由漂移（使用 routes 文件当前值）。" : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
  return `${prefix}\n${base}`
}

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
  const openCodeBaseUrl = resolveOpenCodeBaseUrl(ctx, c)

  const isPendingStillOpen = async (pending: PendingInteraction): Promise<boolean> => {
    try {
      const path = pending.kind === "question" ? "/question" : "/permission"
      const response = await fetch(`${openCodeBaseUrl}${path}`, {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(3000),
      })
      if (!response.ok) return false
      const data = (await response.json()) as unknown
      if (!Array.isArray(data)) return false
      return data.some((item) => {
        const row = item as Record<string, unknown>
        const rowSessionId = trimToUndefined(row.sessionID) || trimToUndefined(row.sessionId)
        const rowId = trimToUndefined(row.id)
        if (rowSessionId !== pending.sessionId) return false
        if (pending.requestId && rowId) return rowId === pending.requestId
        return true
      })
    } catch {
      return false
    }
  }

  const startPendingTimer = (params: {
    kind: PendingInteractionKind
    sessionId: string
    requestId?: string
    targetSession?: string
    routeCorrected: boolean
    tool?: string
    questions?: Array<{ title: string; options: string[] }>
  }) => {
    const pendingKey = buildPendingKey({
      kind: params.kind,
      sessionId: params.sessionId,
      requestId: params.requestId,
      tool: params.tool,
      questions: params.questions,
    })
    if (pendingInteractions.has(pendingKey)) {
      return
    }

    const timer = setTimeout(async () => {
      const pending = pendingInteractions.get(pendingKey)
      if (!pending) return
      const stillOpen = await isPendingStillOpen(pending)
      if (!stillOpen) {
        clearPendingKey(pendingKey)
        return
      }
      if (!c.autoReplyEnabled) {
        clearPendingKey(pendingKey)
        return
      }

      const wakeText = pending.kind === "question"
        ? buildQuestionAutoReplyWakeText({
            workspace: pending.workspace,
            sessionId: pending.sessionId,
            requestId: pending.requestId,
            questions: params.questions || [],
            routeCorrected: params.routeCorrected,
          })
        : buildPermissionAutoReplyWakeText({
            workspace: pending.workspace,
            sessionId: pending.sessionId,
            requestId: pending.requestId,
            tool: params.tool,
            routeCorrected: params.routeCorrected,
          })

      await wakeOpenClaw(c, wakeText, pending.targetSession)
      clearPendingKey(pendingKey)
    }, c.questionTimeoutMs)

    pendingInteractions.set(pendingKey, {
      key: pendingKey,
      kind: params.kind,
      sessionId: params.sessionId,
      requestId: params.requestId,
      workspace,
      targetSession: params.targetSession,
      createdAt: Date.now(),
      timer,
    })
    registerPendingForSession(params.sessionId, pendingKey)
  }

  const handleInteractiveBlock = async (params:
    | {
        kind: "question"
        sessionId: string
        requestId?: string
        route: RouteDecision
        isChildSession: boolean
        questions: Array<{ title: string; options: string[] }>
        tool?: string
      }
    | {
        kind: "permission"
        sessionId: string
        requestId?: string
        route: RouteDecision
        isChildSession: boolean
        tool?: string
      }
  ) => {
    if (params.isChildSession) return

    const pendingKey = buildPendingKey({
      kind: params.kind,
      sessionId: params.sessionId,
      requestId: params.requestId,
      tool: params.tool,
      questions: params.kind === "question" ? params.questions : undefined,
    })
    if (pendingInteractions.has(pendingKey)) {
      return
    }

    // 不在 bridge 里直接调用 oc_send.py 发平台消息（会绑死 bot/chat）。
    // 统一唤醒对应 targetSession，由 OpenClaw 会话根据当前聊天上下文自行发送截图/文本。
    const wakeText = params.kind === "question"
      ? buildQuestionWakeText({
          workspace,
          sessionId: params.sessionId,
          requestId: params.requestId,
          questions: params.questions,
        })
      : buildPermissionWakeText({
          workspace,
          sessionId: params.sessionId,
          requestId: params.requestId,
          tool: params.tool,
        })

    // question/permission 这种关键事件，发送前强制再读一次 routes 文件，避免使用陈旧内存态 target
    const freshTarget = resolveRouteFromFileOnly(c, workspace, params.sessionId) || params.route.targetSession
    await wakeOpenClaw(c, wakeText, freshTarget)

    startPendingTimer({
      kind: params.kind,
      sessionId: params.sessionId,
      requestId: params.requestId,
      targetSession: freshTarget,
      routeCorrected: params.route.routeCorrected,
      tool: params.tool,
      questions: params.kind === "question" ? params.questions : undefined,
    })
  }

  const eventHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.created") {
      const info = props?.info as Record<string, unknown> | undefined
      const sessionId = extractSessionIdFromEvent(props)
      if (sessionId) {
        const parentID = getParentIDFromProps(props)
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
        // v2 防串线：session.created 到达时路由文件可能尚未写入，先不缓存目标；
        // 以首次后续事件解析到的 routes(bySession) 为准，避免锁死到旧目标。
        const createdState = sessionStates.get(sessionId)
        if (createdState) createdState.targetSession = undefined
        await writeNotification(c, "session.created", {
          sessionId,
          title: info?.title || "",
          parentID: parentID || "",
          debug_parent_fields: {
            top_parentID: trimToUndefined(props?.parentID),
            top_parentId: trimToUndefined(props?.parentId),
            info_parentID: trimToUndefined(info?.parentID),
            info_parentId: trimToUndefined(info?.parentId),
            info_parent_obj_id: trimToUndefined((info?.parent as Record<string, unknown> | undefined)?.id),
          },
          debug_props: safeJson(props),
          workspace,
          targetSession,
        })
        if (targetSession) {
          persistSessionRoute(c, workspace, sessionId, targetSession)
        }
      }
      return
    }

    const sessionId = getSessionID(props)
    const routeDecision = validateAndCorrectRoute(
      sessionId,
      resolveTargetSession(c, workspace, sessionId)
    )
    const targetSession = routeDecision.targetSession
    if (sessionId && targetSession && routeDecision.routeCorrected) {
      const routePersisted = persistSessionRoute(c, workspace, sessionId, targetSession)
      await writeNotification(c, "route.corrected", {
        sessionId,
        workspace,
        targetSession,
        routePersisted,
      })
    }

    if (sessionId && !sessionStates.has(sessionId)) {
      const info = props?.info as Record<string, unknown> | undefined
      sessionStates.set(sessionId, {
        status: "running",
        title: trimToUndefined(info?.title) || "",
        agent: trimToUndefined(info?.agent) || "",
        workspace,
        parentID: getParentIDFromProps(props),
        targetSession,
        lastActivity: Date.now(),
        idleTimer: null,
      })
    }

    // 子 session（有 parentID）不触发 wakeOpenClaw，只写文件通知
    // 子 session 完成后主 session 会自动继续，无需打扰用户
    const isChildSession = (() => {
      if (sessionId) {
        const state = sessionStates.get(sessionId)
        if (state?.parentID) return true
      }
      // 也检查事件 properties 里的 parentID（兜底）
      if (getParentIDFromProps(props)) return true
      return looksLikeChildSessionFallback(props, sessionId ? sessionStates.get(sessionId)?.agent : undefined)
    })()

    // Question（显式事件）
    if (QUESTION_EVENTS.has(event.type) && sessionId) {
      const requestId = getRequestID(props)
      const questions = parseQuestionItems(props)
      await writeNotification(c, "question.asked", {
        sessionId,
        workspace,
        requestId,
        targetSession,
        routeCorrected: routeDecision.routeCorrected,
        routeSource: "bySession",
        isChild: isChildSession,
        questions,
      })
      await handleInteractiveBlock({
        kind: "question",
        sessionId,
        requestId,
        route: routeDecision,
        isChildSession,
        questions,
      })
      return
    }

    // Permission（显式事件）
    if (PERMISSION_EVENTS.has(event.type) && sessionId) {
      const requestId = getRequestID(props)
      const tool = getPermissionTool(props)
      await writeNotification(c, "permission.asked", {
        sessionId,
        workspace,
        requestId,
        tool,
        targetSession,
        routeCorrected: routeDecision.routeCorrected,
        routeSource: "bySession",
        isChild: isChildSession,
      })
      await handleInteractiveBlock({
        kind: "permission",
        sessionId,
        requestId,
        tool,
        route: routeDecision,
        isChildSession,
      })
      return
    }

    // Question（通过工具调用触发）
    if (event.type === "tool.execute.before" && sessionId) {
      const toolName = (getPermissionTool(props) || "").toLowerCase()
      const state = sessionStates.get(sessionId)
      if (state) {
        state.lastActivity = Date.now()
        if (state.idleTimer) {
          clearTimeout(state.idleTimer)
          state.idleTimer = null
        }
      }
      if (!QUESTION_TOOLS.has(toolName)) {
        clearPendingForSession(sessionId)
      }

      if (QUESTION_TOOLS.has(toolName)) {
        const requestId = getRequestID(props)
        const questions = parseQuestionItems(props)
        await writeNotification(c, "question.asked", {
          sessionId,
          workspace,
          requestId,
          targetSession,
          routeCorrected: routeDecision.routeCorrected,
          isChild: isChildSession,
          tool: toolName,
          questions,
        })
        await handleInteractiveBlock({
          kind: "question",
          sessionId,
          requestId,
          route: routeDecision,
          isChildSession,
          questions,
          tool: toolName,
        })
      }
      return
    }

    if (event.type === "session.idle") {
      if (!sessionId) return

      const state = sessionStates.get(sessionId)
      if (state?.idleTimer) clearTimeout(state.idleTimer)
      clearPendingForSession(sessionId)

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
          routeSource: "bySession",
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
      clearPendingForSession(sessionId)

      const error = typeof props?.error === "object" ? JSON.stringify(props.error) : String(props?.error || "unknown error")
      const stateWorkspace = state?.workspace || workspace
      const stateTarget = state?.targetSession || targetSession

      await writeNotification(c, "session.error", {
        sessionId,
        error,
        workspace: stateWorkspace,
        targetSession: stateTarget,
        routeSource: "bySession",
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
        clearPendingForSession(messageSessionId)
      }
      return
    }

    if (event.type === "session.deleted") {
      const info = props?.info as { id?: string } | undefined
      if (info?.id) {
        const state = sessionStates.get(info.id)
        if (state?.idleTimer) clearTimeout(state.idleTimer)
        clearPendingForSession(info.id)
        sessionStates.delete(info.id)
      }
      return
    }
  }

  return { event: eventHandler }
}
