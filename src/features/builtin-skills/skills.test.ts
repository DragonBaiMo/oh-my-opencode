import { describe, test, expect } from "bun:test"
import { createBuiltinSkills } from "./skills"


describe("createBuiltinSkills", () => {
	test("returns built-in baseline", () => {
		// given

		// when
		const skills = createBuiltinSkills()
		const names = skills.map((s) => s.name)

		// then
		expect(skills).toHaveLength(8)
		expect(names).toEqual([
			"frontend-ui-ux",
			"git-master",
			"deep-research",
			"browser-tester-devtools",
			"requirements-engineering",
			"contract-delivery",
			"acceptance-criteria",
			"decision-record",
		])
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
		expect(skills.map((s) => s.name)).toContain("requirements-engineering")
		expect(skills.map((s) => s.name)).toContain("contract-delivery")
		expect(skills.map((s) => s.name)).toContain("acceptance-criteria")
		expect(skills.map((s) => s.name)).toContain("decision-record")
		expect(skills.length).toBe(7)
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
		expect(skills.map((s) => s.name)).toContain("requirements-engineering")
		expect(skills.map((s) => s.name)).toContain("contract-delivery")
		expect(skills.map((s) => s.name)).toContain("acceptance-criteria")
		expect(skills.map((s) => s.name)).toContain("decision-record")
		expect(skills.length).toBe(6)
	})

		test("should return an empty array when all skills are disabled", () => {
		// #given
		const options = {
				disabledSkills: new Set([
				"frontend-ui-ux",
				"git-master",
				"deep-research",
				"browser-tester-devtools",
				"requirements-engineering",
				"contract-delivery",
				"acceptance-criteria",
				"decision-record",
			]),
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
		expect(skills.length).toBe(8)
	})

	test("includes Athena analysis skills in baseline", () => {
		// given

		// when
		const skills = createBuiltinSkills()
		const names = skills.map((s) => s.name)

		// then
		expect(names).toContain("requirements-engineering")
		expect(names).toContain("contract-delivery")
		expect(names).toContain("acceptance-criteria")
		expect(names).toContain("decision-record")
	})

})
