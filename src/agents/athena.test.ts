import { describe, test, expect } from "bun:test"
import { createAthenaAgent, ATHENA_PROMPT_METADATA } from "./athena"

const TEST_MODEL = "anthropic/claude-opus-4-6"

describe("createAthenaAgent", () => {
  test("returns subagent config with expected defaults", () => {
    // given
    const agent = createAthenaAgent(TEST_MODEL)

    // then
    expect(agent.mode).toBe("subagent")
    expect(agent.temperature).toBe(0.2)
    expect(agent.model).toBe(TEST_MODEL)
    expect(agent.prompt).toContain("<decision_framework>")
    expect(agent.prompt).toContain("Wiegers")
    expect(agent.prompt).toContain("Cockburn")
  })

  test("denies task and call_omo_agent tools", () => {
    // given
    const agent = createAthenaAgent(TEST_MODEL)
    const permission = agent.permission as Record<string, string>

    // then
    expect(permission["task"]).toBe("deny")
    expect(permission["call_omo_agent"]).toBe("deny")
  })

  test("keeps write/edit unrestricted for artifact output", () => {
    // given
    const agent = createAthenaAgent(TEST_MODEL)
    const permission = agent.permission as Record<string, string>

    // then
    expect(permission["write"]).toBeUndefined()
    expect(permission["edit"]).toBeUndefined()
    expect(permission["apply_patch"]).toBeUndefined()
  })
})

describe("ATHENA_PROMPT_METADATA", () => {
  test("contains trigger/use/avoid sections", () => {
    expect(ATHENA_PROMPT_METADATA.promptAlias).toBe("Athena")
    expect(ATHENA_PROMPT_METADATA.category).toBe("specialist")
    expect(ATHENA_PROMPT_METADATA.cost).toBe("MODERATE")
    expect(ATHENA_PROMPT_METADATA.triggers.length).toBeGreaterThan(0)
    expect((ATHENA_PROMPT_METADATA.useWhen ?? []).length).toBeGreaterThan(0)
    expect((ATHENA_PROMPT_METADATA.avoidWhen ?? []).length).toBeGreaterThan(0)
  })
})
