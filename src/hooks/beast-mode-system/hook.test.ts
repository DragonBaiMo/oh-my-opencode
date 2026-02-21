import { describe, expect, test } from "bun:test"
import { createBeastModeSystemHook, BEAST_MODE_SYSTEM_PROMPT } from "./hook"
import type { Model } from "@opencode-ai/sdk"

const createMockModel = (providerID: string, id: string): Model => ({
  id,
  providerID,
  api: { id: "test", url: "http://test", npm: "test" },
  name: "Test Model",
  capabilities: {
    temperature: true,
    reasoning: false,
    attachment: false,
    toolcall: true,
    input: { text: true, audio: false, image: false, video: false, pdf: false },
    output: { text: true, audio: false, image: false, video: false, pdf: false },
  },
  cost: { input: 0, output: 0 },
  limit: { context: 128000, output: 4096 },
})

describe("beast-mode-system hook", () => {
  test("injects beast mode prompt for copilot gpt-4.1", async () => {
    //#given
    const model = createMockModel("github-copilot", "gpt-4.1")
    const hook = createBeastModeSystemHook()
    const output = { system: [] as string[] }

    //#when
    await hook["experimental.chat.system.transform"]?.({ model }, output)

    //#then
    expect(output.system[0]).toContain("Beast Mode")
    expect(output.system[0]).toContain(BEAST_MODE_SYSTEM_PROMPT.trim().slice(0, 20))
  })

  test("does not inject for other models", async () => {
    //#given
    const model = createMockModel("anthropic", "claude-3-opus")
    const hook = createBeastModeSystemHook()
    const output = { system: [] as string[] }

    //#when
    await hook["experimental.chat.system.transform"]?.({ model }, output)

    //#then
    expect(output.system.length).toBe(0)
  })

  test("avoids duplicate insertion", async () => {
    //#given
    const model = createMockModel("github-copilot", "gpt-4.1")
    const hook = createBeastModeSystemHook()
    const output = { system: [BEAST_MODE_SYSTEM_PROMPT] }

    //#when
    await hook["experimental.chat.system.transform"]?.({ model }, output)

    //#then
    expect(output.system.length).toBe(1)
  })
})
