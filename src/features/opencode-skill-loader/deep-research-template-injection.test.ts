import { describe, expect, test } from "bun:test"
import { injectDeepResearchScriptPath } from "./deep-research-template-injection"

describe("deep-research-template-injection", () => {
	test("replaces deep research script placeholder with resolved path", () => {
		//#given
		const template = 'node "{{DEEP_RESEARCH_SCRIPT_PATH}}" --model "grok-4.20-beta" --prompt "ping"'

		//#when
		const resolved = injectDeepResearchScriptPath(template)

		//#then
		expect(resolved).toContain("scripts/deep-research.mjs")
		expect(resolved).not.toContain("{{DEEP_RESEARCH_SCRIPT_PATH}}")
	})
})
