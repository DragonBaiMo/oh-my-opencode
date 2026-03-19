import { describe, expect, test, mock } from "bun:test"

mock.module("../../shared/session-utils", () => ({
  isCallerOrchestrator: async () => true,
}))

const { createToolExecuteBeforeHandler } = await import("./tool-execute-before")

describe("createToolExecuteBeforeHandler", () => {
  const orchestratorSessionID = "session-orchestrator"

  function createCtx() {
    return {
      client: {
        session: {
          prompt: mock(async () => undefined),
        },
      },
    } as unknown as Parameters<typeof createToolExecuteBeforeHandler>[0]["ctx"]
  }

  test("injects SINGLE_TASK_DIRECTIVE by default when enabled", async () => {
    const handler = createToolExecuteBeforeHandler({
      ctx: createCtx(),
      pendingFilePaths: new Map<string, string>(),
      singleTaskDirectiveEnabled: true,
    })
    const toolOutput = {
      args: { prompt: "Do two related file changes." },
      message: "",
    }

    await handler(
      { tool: "task", sessionID: orchestratorSessionID },
      toolOutput,
    )

    expect(typeof toolOutput.args.prompt).toBe("string")
    expect(String(toolOutput.args.prompt)).toContain("SINGLE TASK ONLY")
    expect(String(toolOutput.args.prompt)).toContain("Do two related file changes.")
  })

  test("does not inject SINGLE_TASK_DIRECTIVE when disabled by config", async () => {
    const handler = createToolExecuteBeforeHandler({
      ctx: createCtx(),
      pendingFilePaths: new Map<string, string>(),
      singleTaskDirectiveEnabled: false,
    })
    const originalPrompt = "Do two related file changes."
    const toolOutput = {
      args: { prompt: originalPrompt },
      message: "",
    }

    await handler(
      { tool: "task", sessionID: orchestratorSessionID },
      toolOutput,
    )

    expect(toolOutput.args.prompt).toBe(originalPrompt)
    expect(String(toolOutput.args.prompt)).not.toContain("SINGLE TASK ONLY")
  })
})
