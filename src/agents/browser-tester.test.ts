import { describe, expect, test } from "bun:test"
import { createBrowserTesterAgent, BROWSER_TESTER_PROMPT_METADATA } from "./browser-tester"

const TEST_MODEL = "google/gemini-3-pro"

describe("createBrowserTesterAgent", () => {
	test("returns subagent config with expected defaults", () => {
		// given
		const agent = createBrowserTesterAgent(TEST_MODEL)

		// then
		expect(agent.mode).toBe("subagent")
		expect(agent.temperature).toBe(0.1)
		expect(agent.model).toBe(TEST_MODEL)
		expect(agent.prompt).toContain("Chrome DevTools MCP")
	})
})

describe("BROWSER_TESTER_PROMPT_METADATA", () => {
	test("contains trigger/use/avoid sections", () => {
		expect(BROWSER_TESTER_PROMPT_METADATA.promptAlias).toBe("BrowserTester")
		expect(BROWSER_TESTER_PROMPT_METADATA.category).toBe("testing")
		expect(BROWSER_TESTER_PROMPT_METADATA.cost).toBe("MODERATE")
		expect(BROWSER_TESTER_PROMPT_METADATA.triggers.length).toBeGreaterThan(0)
		expect((BROWSER_TESTER_PROMPT_METADATA.useWhen ?? []).length).toBeGreaterThan(0)
		expect((BROWSER_TESTER_PROMPT_METADATA.avoidWhen ?? []).length).toBeGreaterThan(0)
	})
})
