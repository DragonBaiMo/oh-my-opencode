import { describe, expect, test } from "bun:test"
import { AGENT_NAMES, normalizeAgentName, detectAgentFromSession } from "./agent-resolver"

describe("runtime-fallback agent-resolver", () => {
	test("includes browser-tester and athena in known agent names", () => {
		expect(AGENT_NAMES).toContain("browser-tester")
		expect(AGENT_NAMES).toContain("athena")
	})

	test("normalizes browser-tester and athena names", () => {
		expect(normalizeAgentName("browser-tester")).toBe("browser-tester")
		expect(normalizeAgentName("Athena")).toBe("athena")
	})

	test("detects browser-tester and athena from session ids", () => {
		expect(detectAgentFromSession("session-browser-tester-123")).toBe("browser-tester")
		expect(detectAgentFromSession("abc-athena-xyz")).toBe("athena")
	})
})
