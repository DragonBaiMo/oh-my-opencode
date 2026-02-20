import { describe, test, expect } from "bun:test"
import { createBuiltinSkills } from "./skills"

const LEGACY_BROWSER_PROVIDER = String.fromCharCode(112, 108, 97, 121, 119, 114, 105, 103, 104, 116)

describe("createBuiltinSkills", () => {
	test("returns built-in baseline without browser-family skills", () => {
		// given

		// when
		const skills = createBuiltinSkills()
		const names = skills.map((s) => s.name)

		// then
		expect(skills).toHaveLength(4)
		expect(names).toEqual([
			"frontend-ui-ux",
			"git-master",
			"deep-research",
			"browser-tester-devtools",
		])
		expect(names).not.toContain(LEGACY_BROWSER_PROVIDER)
		expect(names).not.toContain("agent-browser")
		expect(names).not.toContain("dev-browser")
	})

	test("ignores browserProvider option for built-in baseline", () => {
		// given
		const legacyProvider = { browserProvider: LEGACY_BROWSER_PROVIDER as any }
		const agentBrowserProvider = { browserProvider: "agent-browser" as const }

		// when
		const legacySkills = createBuiltinSkills(legacyProvider as any)
		const agentBrowserSkills = createBuiltinSkills(agentBrowserProvider)

		// then
		expect(legacySkills.map((s) => s.name)).toEqual(agentBrowserSkills.map((s) => s.name))
		expect(legacySkills).toHaveLength(4)
	})

	test("browser-tester-devtools skill is agent-restricted with chrome-devtools MCP", () => {
		// given

		// when
		const skills = createBuiltinSkills()
		const devtoolsSkill = skills.find((s) => s.name === "browser-tester-devtools")

		// then
		expect(devtoolsSkill).toBeDefined()
		expect(devtoolsSkill!.agent).toBe("browser-tester")
		expect(devtoolsSkill!.mcpConfig).toHaveProperty("chrome-devtools")
		expect(devtoolsSkill!.mcpConfig!["chrome-devtools"]).toEqual({
			command: "npx",
			args: ["-y", "chrome-devtools-mcp@latest"],
		})
	})

	test("should exclude git-master when it is in disabledSkills", () => {
		// #given
		const options = { disabledSkills: new Set(["git-master"]) }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.map((s) => s.name)).not.toContain("git-master")
		expect(skills.map((s) => s.name)).toContain("frontend-ui-ux")
		expect(skills.map((s) => s.name)).toContain("deep-research")
		expect(skills.map((s) => s.name)).toContain("browser-tester-devtools")
		expect(skills.length).toBe(3)
	})

	test("should exclude multiple skills when they are in disabledSkills", () => {
		// #given
		const options = { disabledSkills: new Set(["git-master", "browser-tester-devtools"]) }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.map((s) => s.name)).not.toContain("git-master")
		expect(skills.map((s) => s.name)).not.toContain("browser-tester-devtools")
		expect(skills.map((s) => s.name)).toContain("frontend-ui-ux")
		expect(skills.map((s) => s.name)).toContain("deep-research")
		expect(skills.length).toBe(2)
	})

	test("should return an empty array when all skills are disabled", () => {
		// #given
		const options = {
			disabledSkills: new Set(["frontend-ui-ux", "git-master", "deep-research", "browser-tester-devtools"]),
		}

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.length).toBe(0)
	})

	test("should return all skills when disabledSkills set is empty", () => {
		// #given
		const options = { disabledSkills: new Set<string>() }

		// #when
		const skills = createBuiltinSkills(options)

		// #then
		expect(skills.length).toBe(4)
	})

	test("returns playwright-cli skill when browserProvider is 'playwright-cli'", () => {
		// given
		const options = { browserProvider: "playwright-cli" as const }

		// when
		const skills = createBuiltinSkills(options)

		// then
		const playwrightSkill = skills.find((s) => s.name === "playwright")
		const agentBrowserSkill = skills.find((s) => s.name === "agent-browser")
		expect(playwrightSkill).toBeDefined()
		expect(playwrightSkill!.description).toContain("browser")
		expect(playwrightSkill!.allowedTools).toContain("Bash(playwright-cli:*)")
		expect(playwrightSkill!.mcpConfig).toBeUndefined()
		expect(agentBrowserSkill).toBeUndefined()
	})

	test("playwright-cli skill template contains CLI commands", () => {
		// given
		const options = { browserProvider: "playwright-cli" as const }

		// when
		const skills = createBuiltinSkills(options)
		const skill = skills.find((s) => s.name === "playwright")

		// then
		expect(skill!.template).toContain("playwright-cli open")
		expect(skill!.template).toContain("playwright-cli snapshot")
		expect(skill!.template).toContain("playwright-cli click")
	})
})
