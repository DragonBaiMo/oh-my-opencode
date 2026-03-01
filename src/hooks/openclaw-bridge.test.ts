/// <reference types="bun-types" />
import { afterEach, describe, expect, mock, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import type { PluginInput } from "@opencode-ai/plugin"

import { createOpenClawBridge } from "./openclaw-bridge"

const originalFetch = globalThis.fetch
const originalEnvTarget = process.env.OPENCLAW_TARGET_SESSION
const originalEnvSessionKey = process.env.OPENCLAW_SESSION_KEY

const tempDirs: string[] = []

function createTempDir(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

function writeRoutesFile(filePath: string, bySession: Record<string, string>) {
  writeFileSync(
    filePath,
    JSON.stringify(
      {
        version: 2,
        bySession,
        deliveryBySession: {},
      },
      null,
      2,
    ),
  )
}

function extractSessionFromFetchCall(call: unknown): string | undefined {
  if (!Array.isArray(call)) return undefined
  const init = call.length > 1 ? (call[1] as RequestInit | undefined) : undefined
  const body = JSON.parse(String(init?.body || "{}")) as { session?: string }
  return body.session
}

function extractFetchUrlFromCall(call: unknown): string {
  if (!Array.isArray(call) || call.length === 0) return ""
  const input = call[0]
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (input && typeof input === "object" && "url" in input) {
    const url = (input as { url?: unknown }).url
    return typeof url === "string" ? url : ""
  }
  return ""
}

function extractFetchBodyFromCall(call: unknown): string {
  if (!Array.isArray(call)) return ""
  const init = call.length > 1 ? (call[1] as RequestInit | undefined) : undefined
  return String(init?.body || "")
}

function wakeCalls(calls: unknown[]): unknown[] {
  return calls.filter((call) => extractFetchUrlFromCall(call).includes("/hooks/wake"))
}

function allWakeBodiesUseInsert(calls: unknown[]): boolean {
  if (calls.length === 0) return false
  return calls.every((call) => {
    const bodyText = extractFetchBodyFromCall(call)
    return bodyText.includes('"text":"/insert ') || bodyText.includes('"text": "/insert ')
  })
}

function allFetchCallsCarrySession(calls: unknown[], expected: string): boolean {
  if (calls.length === 0) return false
  const sessions = calls
    .map((call) => extractSessionFromFetchCall(call))
    .filter((value): value is string => typeof value === "string")
  return sessions.length === calls.length && sessions.every((session) => session === expected)
}

function firstFetchCallSession(calls: unknown[]): string | undefined {
  if (calls.length === 0) return undefined
  return extractSessionFromFetchCall(calls[0])
}

function createBridgeWithTestConfig(params?: {
  workspace?: string
  bySession?: Record<string, string>
  allowEnvSessionFallback?: boolean
  requireExplicitRoute?: boolean
}) {
  const workspace = params?.workspace || createTempDir("omo-openclaw-bridge-workspace-")
  const notificationsDir = createTempDir("omo-openclaw-bridge-notifications-")
  const routesFile = join(notificationsDir, "session-routes.json")

  writeRoutesFile(routesFile, params?.bySession || {})

  const bridge = createOpenClawBridge(
    {
      directory: workspace,
      project: { worktree: workspace },
    } as PluginInput,
    {
      gatewayUrl: "http://127.0.0.1:18789",
      hookToken: "test-token",
      notificationsDir,
      questionTimeoutMs: 500,
      idleConfirmationDelay: 10,
      autoReplyEnabled: false,
      opencodeBaseUrl: "http://127.0.0.1:4096",
      sessionRoutesFile: routesFile,
      allowEnvSessionFallback: params?.allowEnvSessionFallback ?? false,
      requireExplicitRoute: params?.requireExplicitRoute ?? true,
    },
  )

  return { bridge, workspace }
}

async function emitSessionError(bridge: ReturnType<typeof createOpenClawBridge>, sessionID: string) {
  await bridge.event?.({
    event: {
      type: "session.error",
      properties: {
        sessionID,
        error: { message: "boom" },
      },
    },
  })
}

async function emitSessionIdle(bridge: ReturnType<typeof createOpenClawBridge>, sessionID: string) {
  await bridge.event?.({
    event: {
      type: "session.idle",
      properties: {
        sessionID,
      },
    },
  })
}

async function emitQuestionAsked(
  bridge: ReturnType<typeof createOpenClawBridge>,
  sessionID: string,
  requestID = "q_1",
  title = "继续吗？",
) {
  await bridge.event?.({
    event: {
      type: "question.asked",
      properties: {
        sessionID,
        id: requestID,
        questions: [{ question: title, options: [{ label: "是" }, { label: "否" }] }],
      },
    },
  })
}

async function emitPermissionAsked(
  bridge: ReturnType<typeof createOpenClawBridge>,
  sessionID: string,
  requestID = "p_1",
) {
  await bridge.event?.({
    event: {
      type: "permission.asked",
      properties: {
        sessionID,
        id: requestID,
        tool: "bash",
      },
    },
  })
}

describe("openclaw-bridge strict route behavior", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.OPENCLAW_TARGET_SESSION = originalEnvTarget
    process.env.OPENCLAW_SESSION_KEY = originalEnvSessionKey
    while (tempDirs.length) {
      const dir = tempDirs.pop()
      if (!dir) continue
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("skips wake dispatch when no explicit route exists", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { bridge } = createBridgeWithTestConfig()
    await emitSessionError(bridge, "ses_unbound")

    const calls = wakeCalls(fetchMock.mock.calls as unknown[])
    expect(calls.length).toBe(0)
  })

  test("dispatches wake with session when bySession route exists", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const targetSession = "agent:main-agent-9:main"
    const workspace = createTempDir("omo-openclaw-bridge-workspace-")
    const routeMap: Record<string, string> = {
      [`${workspace}::ses_bound`]: targetSession,
    }
    const { bridge } = createBridgeWithTestConfig({
      workspace,
      bySession: {
        ...routeMap,
      },
    })

    await emitSessionError(bridge, "ses_bound")

    const calls = wakeCalls(fetchMock.mock.calls as unknown[])
    expect(calls.length).toBeGreaterThan(0)
    expect(allFetchCallsCarrySession(calls, targetSession)).toBe(true)
    expect(allWakeBodiesUseInsert(calls)).toBe(true)
  })

  test("does not use env fallback by default", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    process.env.OPENCLAW_TARGET_SESSION = "agent:env-agent:main"

    const { bridge } = createBridgeWithTestConfig({
      requireExplicitRoute: false,
      allowEnvSessionFallback: false,
    })
    await emitSessionError(bridge, "ses_no_route")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(firstFetchCallSession(fetchMock.mock.calls as unknown[])).toBeUndefined()
  })

  test("uses env fallback only when explicitly enabled", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    process.env.OPENCLAW_TARGET_SESSION = "agent:env-agent:main"

    const { bridge } = createBridgeWithTestConfig({
      requireExplicitRoute: false,
      allowEnvSessionFallback: true,
    })
    await emitSessionError(bridge, "ses_no_route")

    const calls = wakeCalls(fetchMock.mock.calls as unknown[])
    expect(calls.length).toBeGreaterThan(0)
    expect(allFetchCallsCarrySession(calls, "agent:env-agent:main")).toBe(true)
    expect(allWakeBodiesUseInsert(calls)).toBe(true)
  })

  test("session.idle with explicit route uses insert-only wake", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const targetSession = "agent:main-agent-9:main"
    const workspace = createTempDir("omo-openclaw-bridge-workspace-")
    const { bridge } = createBridgeWithTestConfig({
      workspace,
      bySession: {
        [`${workspace}::ses_done`]: targetSession,
      },
    })

    await emitSessionIdle(bridge, "ses_done")
    await new Promise((resolve) => setTimeout(resolve, 30))

    const calls = wakeCalls(fetchMock.mock.calls as unknown[])
    expect(calls.length).toBe(1)
    expect(allFetchCallsCarrySession(calls, targetSession)).toBe(true)
    expect(allWakeBodiesUseInsert(calls)).toBe(true)
  })

  test("question and permission events without route do not call wake endpoint", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { bridge } = createBridgeWithTestConfig()
    await emitQuestionAsked(bridge, "ses_need_reply_unbound", "q_unbound", "未绑定问题")
    await emitPermissionAsked(bridge, "ses_need_reply_unbound", "p_unbound")

    const calls = wakeCalls(fetchMock.mock.calls as unknown[])
    expect(calls.length).toBe(0)
    const sessions = calls
      .map((call) => extractSessionFromFetchCall(call))
      .filter((value): value is string => typeof value === "string")
    expect(sessions).toEqual([])
    const bodies = calls.map((call) => extractFetchBodyFromCall(call))
    expect(bodies).toEqual([])
  })

  test("question and permission events with route use insert-only wake", async () => {
    const fetchMock = mock(async () => ({ ok: true } as Response))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const targetSession = "agent:main-agent-7:main"
    const workspace = createTempDir("omo-openclaw-bridge-workspace-")
    const { bridge } = createBridgeWithTestConfig({
      workspace,
      bySession: {
        [`${workspace}::ses_need_reply_routed`]: targetSession,
      },
    })

    await emitQuestionAsked(bridge, "ses_need_reply_routed", "q_routed", "已绑定问题")
    await emitPermissionAsked(bridge, "ses_need_reply_routed", "p_routed")

    const calls = wakeCalls(fetchMock.mock.calls as unknown[])
    expect(calls.length).toBe(2)
    expect(allFetchCallsCarrySession(calls, targetSession)).toBe(true)
    expect(allWakeBodiesUseInsert(calls)).toBe(true)
  })
})
