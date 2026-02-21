import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { clearSkillCache } from "../../features/opencode-skill-loader/skill-content"
import { resolveSkillContent } from "./skill-resolver"

describe("delegate-task skill resolver", () => {
  let tempDir: string | undefined

  beforeEach(() => {
    clearSkillCache()
  })

  afterEach(() => {
    clearSkillCache()
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  test("resolves browser-tester-devtools when target agent is browser-tester", async () => {
    //#when
    const result = await resolveSkillContent(["browser-tester-devtools"], {
      targetAgent: "browser-tester",
    })

    //#then
    expect(result.error).toBeNull()
    expect(result.content).toContain("Browser Tester DevTools MCP")
  })

  test("rejects browser-tester-devtools when target agent is not browser-tester", async () => {
    //#when
    const result = await resolveSkillContent(["browser-tester-devtools"], {
      targetAgent: "oracle",
    })

    //#then
    expect(result.error).toContain("Skills restricted to other agents")
    expect(result.error).toContain("browser-tester-devtools")
    expect(result.content).toBeUndefined()
  })

  test("available skill list includes discovered + built-in skills", async () => {
    //#given
    tempDir = mkdtempSync(join(tmpdir(), "omo-skill-resolver-"))
    const skillDir = join(tempDir, ".opencode", "skills", "test-discovered")
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: test-discovered
description: discovered skill for tests
---
discovered body`
    )

    //#when
    const result = await resolveSkillContent(["missing-skill"], {
      includeClaudeCodePaths: false,
      directory: tempDir,
      targetAgent: "browser-tester",
    })

    //#then
    expect(result.error).toContain("Skills not found: missing-skill")
    expect(result.error).toContain("test-discovered")
    expect(result.error).toContain("browser-tester-devtools")
  })

  test("resolves Athena builtin skills by name", async () => {
    //#when
    const result = await resolveSkillContent([
      "requirements-engineering",
      "contract-delivery",
      "acceptance-criteria",
      "decision-record",
    ], {
      targetAgent: "athena",
    })

    //#then
    expect(result.error).toBeNull()
    expect(result.content).toContain("Requirements Engineering")
    expect(result.content).toContain("Contract Delivery")
    expect(result.content).toContain("Acceptance Criteria")
    expect(result.content).toContain("Decision Record")
  })
})
