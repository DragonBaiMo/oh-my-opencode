declare const require: (name: string) => any
const { describe, test, expect, beforeEach, afterEach, spyOn, mock } = require("bun:test")
import { resolveSubagentExecution } from "./subagent-resolver"
import type { DelegateTaskArgs } from "./types"
import type { ExecutorContext } from "./executor-types"
import * as logger from "../../shared/logger"

function createBaseArgs(overrides?: Partial<DelegateTaskArgs>): DelegateTaskArgs {
  return {
    description: "Run review",
    prompt: "Review the current changes",
    run_in_background: false,
    load_skills: [],
    subagent_type: "oracle",
    ...overrides,
  }
}

function createExecutorContext(agentsFn: () => Promise<unknown>): ExecutorContext {
  const client = {
    app: {
      agents: agentsFn,
    },
  } as ExecutorContext["client"]

  return {
    client,
    manager: {} as ExecutorContext["manager"],
    directory: "/tmp/test",
  }
}

describe("resolveSubagentExecution", () => {
  let logSpy: ReturnType<typeof spyOn> | undefined

  beforeEach(() => {
    mock.restore()
    logSpy = spyOn(logger, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy?.mockRestore()
  })

  test("returns delegation error when agent discovery fails instead of silently proceeding", async () => {
    //#given
    const resolverError = new Error("agents API unavailable")
    const args = createBaseArgs()
    const executorCtx = createExecutorContext(async () => {
      throw resolverError
    })

    //#when
    const result = await resolveSubagentExecution(args, executorCtx, "sisyphus", "deep")

    //#then
    expect(result.agentToUse).toBe("")
    expect(result.categoryModel).toBeUndefined()
    expect(result.error).toBe("Failed to delegate to agent \"oracle\": agents API unavailable")
  })

  test("logs failure details when subagent resolution throws", async () => {
    //#given
    const args = createBaseArgs({ subagent_type: "review" })
    const executorCtx = createExecutorContext(async () => {
      throw new Error("network timeout")
    })

    //#when
    await resolveSubagentExecution(args, executorCtx, "sisyphus", "deep")

    //#then
    expect(logSpy).toHaveBeenCalledTimes(1)
    const callArgs = logSpy?.mock.calls[0]
    expect(callArgs?.[0]).toBe("[delegate-task] Failed to resolve subagent execution")
    expect(callArgs?.[1]).toEqual({
      requestedAgent: "review",
      parentAgent: "sisyphus",
      error: "network timeout",
    })
  })

  test("resolves Athena display name to athena config key and delegates", async () => {
    //#given
    const args = createBaseArgs({ subagent_type: "Athena" })
    const executorCtx = createExecutorContext(async () => [
      { name: "athena", mode: "subagent", model: { providerID: "anthropic", modelID: "claude-opus-4-6" } },
    ])

    //#when
    const result = await resolveSubagentExecution(args, executorCtx, "sisyphus", "deep")

    //#then
    expect(result.error).toBeUndefined()
    expect(result.agentToUse).toBe("athena")
    expect(result.categoryModel).toBeDefined()
  })

  test("normalizes @agent syntax to plain subagent_type", async () => {
    //#given
    const args = createBaseArgs({ subagent_type: "@athena" })
    const executorCtx = createExecutorContext(async () => [
      { name: "athena", mode: "subagent", model: { providerID: "anthropic", modelID: "claude-opus-4-6" } },
    ])

    //#when
    const result = await resolveSubagentExecution(args, executorCtx, "sisyphus", "deep")

    //#then
    expect(result.error).toBeUndefined()
    expect(result.agentToUse).toBe("athena")
  })

  test("normalizes @browser-tester and resolves browser tester agent", async () => {
    //#given
    const args = createBaseArgs({ subagent_type: "@browser-tester" })
    const executorCtx = createExecutorContext(async () => [
      { name: "browser-tester", mode: "subagent", model: { providerID: "google", modelID: "gemini-3-pro" } },
    ])

    //#when
    const result = await resolveSubagentExecution(args, executorCtx, "sisyphus", "deep")

    //#then
    expect(result.error).toBeUndefined()
    expect(result.agentToUse).toBe("browser-tester")
  })
})
