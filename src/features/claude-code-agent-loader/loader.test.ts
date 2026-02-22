import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { tmpdir } from "node:os"

import { loadProjectAgents, loadUserAgents } from "./loader"

function writeAgentFile(path: string, content: string): void {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content, "utf-8")
}

describe("claude-code-agent-loader", () => {
	let tempHome: string
	let tempProject: string

	beforeEach(() => {
		mock.restore()
		tempHome = mkdtempSync(join(tmpdir(), "omo-agent-home-"))
		tempProject = mkdtempSync(join(tmpdir(), "omo-agent-project-"))
		process.env.CLAUDE_CONFIG_DIR = join(tempHome, ".claude")
		process.env.OPENCODE_CONFIG_DIR = join(tempHome, ".config", "opencode")
	})

	afterEach(() => {
		delete process.env.CLAUDE_CONFIG_DIR
		delete process.env.OPENCODE_CONFIG_DIR
		rmSync(tempHome, { recursive: true, force: true })
		rmSync(tempProject, { recursive: true, force: true })
	})

	test("loads user agents from both .claude and opencode config directories", () => {
		// given
		writeAgentFile(
			join(tempHome, ".claude", "agents", "claude-user.md"),
			`---\nname: claude-user\ndescription: Claude user agent\n---\nPrompt A`,
		)
		writeAgentFile(
			join(tempHome, ".config", "opencode", "agents", "opencode-user.md"),
			`---\nname: opencode-user\ndescription: OpenCode user agent\n---\nPrompt B`,
		)

		// when
		const agents = loadUserAgents()

		// then
		expect(Object.keys(agents)).toEqual(expect.arrayContaining(["claude-user", "opencode-user"]))
		expect(agents["claude-user"].mode).toBe("subagent")
		expect(agents["opencode-user"].mode).toBe("subagent")
	})

	test("loads project agents from both .claude and .opencode directories", () => {
		// given
		writeAgentFile(
			join(tempProject, ".claude", "agents", "claude-project.md"),
			`---\nname: claude-project\ndescription: Claude project agent\n---\nPrompt C`,
		)
		writeAgentFile(
			join(tempProject, ".opencode", "agents", "opencode-project.md"),
			`---\nname: opencode-project\ndescription: OpenCode project agent\n---\nPrompt D`,
		)

		// when
		const agents = loadProjectAgents(tempProject)

		// then
		expect(Object.keys(agents)).toEqual(expect.arrayContaining(["claude-project", "opencode-project"]))
	})

	test("respects frontmatter mode for custom agents", () => {
		// given
		writeAgentFile(
			join(tempProject, ".claude", "agents", "requirements.md"),
			`---\nname: requirements-analyst\ndescription: Business requirement agent\nmode: primary\n---\nPrompt E`,
		)

		// when
		const agents = loadProjectAgents(tempProject)

		// then
		expect(agents["requirements-analyst"]?.mode).toBe("primary")
	})
})
