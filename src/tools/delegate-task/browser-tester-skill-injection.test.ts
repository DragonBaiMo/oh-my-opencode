import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { createDelegateTask } from "./tools"
import * as executor from "./executor"

const TEST_CONNECTED_PROVIDERS = ["anthropic", "google", "openai"]
const TEST_AVAILABLE_MODELS = new Set([
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-5",
  "google/gemini-3-pro",
  "openai/gpt-5.2",
  "openai/gpt-5.3-codex",
])
const LEGACY_BROWSER_SKILL = String.fromCharCode(112, 108, 97, 121, 119, 114, 105, 103, 104, 116)

function createTool() {
  const manager = {
    launch: async () => ({
      id: "task-1",
      status: "pending",
      description: "Test task",
      agent: "browser-tester",
      sessionID: "ses-1",
    }),
  }

  const client = {
    app: {
      agents: async () => ({
        data: [
          { name: "browser-tester", mode: "subagent" },
          { name: "oracle", mode: "subagent" },
        ],
      }),
    },
    config: { get: async () => ({}) },
    provider: { list: async () => ({ data: { connected: ["openai"] } }) },
    model: { list: async () => ({ data: [{ provider: "openai", id: "gpt-5.3-codex" }] }) },
    session: {
      create: async () => ({ data: { id: "ses-sync" } }),
      prompt: async () => ({ data: {} }),
      promptAsync: async () => ({ data: {} }),
      messages: async () => ({ data: [] }),
      status: async () => ({ data: {} }),
    },
  }

  return createDelegateTask({
    manager: manager as any,
    client: client as any,
    directory: process.cwd(),
    connectedProvidersOverride: TEST_CONNECTED_PROVIDERS,
    availableModelsOverride: new Set(TEST_AVAILABLE_MODELS),
  })
}

describe("delegate-task browser-tester skill injection", () => {
  beforeEach(() => {
    mock.restore()
  })

  afterEach(() => {
    mock.restore()
  })

  test("auto-injects browser-tester-devtools for browser-tester background runs", async () => {
    //#given
    const tool = createTool()
    const resolveSkillContentSpy = spyOn(executor, "resolveSkillContent").mockResolvedValue({
      content: "resolved",
      error: null,
    })

    const args: {
      description: string
      prompt: string
      subagent_type: string
      run_in_background: boolean
      load_skills: string[]
    } = {
      description: "Browser background",
      prompt: "Run browser checks",
      subagent_type: "browser-tester",
      run_in_background: true,
      load_skills: [LEGACY_BROWSER_SKILL],
    }

    //#when
    await tool.execute(args, {
      sessionID: "parent-session",
      messageID: "msg-1",
      agent: "sisyphus",
      abort: new AbortController().signal,
    })

    //#then
    expect(args.load_skills).toEqual(["browser-tester-devtools"])
    expect(resolveSkillContentSpy).toHaveBeenCalledWith(
      ["browser-tester-devtools"],
      expect.objectContaining({ targetAgent: "browser-tester" })
    )
  })

  test("does not auto-inject for non-browser-tester runs", async () => {
    //#given
    const tool = createTool()
    const resolveSkillContentSpy = spyOn(executor, "resolveSkillContent").mockResolvedValue({
      content: "resolved",
      error: null,
    })

    const args: {
      description: string
      prompt: string
      subagent_type: string
      run_in_background: boolean
      load_skills: string[]
    } = {
      description: "Oracle background",
      prompt: "Run oracle checks",
      subagent_type: "oracle",
      run_in_background: true,
      load_skills: ["git-master"],
    }

    //#when
    await tool.execute(args, {
      sessionID: "parent-session",
      messageID: "msg-2",
      agent: "sisyphus",
      abort: new AbortController().signal,
    })

    //#then
    expect(args.load_skills).toEqual(["git-master"])
    expect(resolveSkillContentSpy).toHaveBeenCalledWith(
      ["git-master"],
      expect.objectContaining({ targetAgent: "oracle" })
    )
  })

  test("auto-injects browser-tester-devtools for browser-tester sync runs", async () => {
    //#given
    const tool = createTool()
    const resolveSkillContentSpy = spyOn(executor, "resolveSkillContent").mockResolvedValue({
      content: "resolved",
      error: null,
    })
    const executeSyncTaskSpy = spyOn(executor, "executeSyncTask").mockResolvedValue("sync done")

    const args: {
      description: string
      prompt: string
      subagent_type: string
      run_in_background: boolean
      load_skills: string[]
    } = {
      description: "Browser sync",
      prompt: "Run browser sync checks",
      subagent_type: "browser-tester",
      run_in_background: false,
      load_skills: [],
    }

    //#when
    await tool.execute(args, {
      sessionID: "parent-session",
      messageID: "msg-3",
      agent: "sisyphus",
      abort: new AbortController().signal,
    })

    //#then
    expect(args.load_skills).toEqual(["browser-tester-devtools"])
    expect(resolveSkillContentSpy).toHaveBeenCalledWith(
      ["browser-tester-devtools"],
      expect.objectContaining({ targetAgent: "browser-tester" })
    )
    expect(executeSyncTaskSpy).toHaveBeenCalled()
  })

  test("removes multiple competing skills for browser-tester", async () => {
    //#given
    const tool = createTool()
    const resolveSkillContentSpy = spyOn(executor, "resolveSkillContent").mockResolvedValue({
      content: "resolved",
      error: null,
    })

    const args: {
      description: string
      prompt: string
      subagent_type: string
      run_in_background: boolean
      load_skills: string[]
    } = {
      description: "Multiple competing skills",
      prompt: "Run browser checks",
      subagent_type: "browser-tester",
      run_in_background: true,
      load_skills: [LEGACY_BROWSER_SKILL, "agent-browser", "dev-browser", "git-master"],
    }

    //#when
    await tool.execute(args, {
      sessionID: "parent-session",
      messageID: "msg-4",
      agent: "sisyphus",
      abort: new AbortController().signal,
    })

    //#then
    expect(args.load_skills).toEqual(["git-master", "browser-tester-devtools"])
  })
})
