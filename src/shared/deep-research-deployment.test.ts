import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  deployDeepResearchScript,
  resolveDeepResearchTargetPath,
  type DeployDeepResearchScriptOptions,
} from "./deep-research-deployment"

describe("deep-research-deployment", () => {
  let tempRoot: string

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), "omo-deep-research-deploy-"))
  })

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  test("deploys when target missing and source exists", async () => {
    //#given
    const pluginDir = join(tempRoot, "plugin")
    const sourceScript = join(tempRoot, "package", "scripts", "deep-research.mjs")
    mkdirSync(join(tempRoot, "package", "scripts"), { recursive: true })
    writeFileSync(sourceScript, "console.log('deep-research source')\n", "utf8")

    const options: DeployDeepResearchScriptOptions = {
      pluginDir,
      sourceCandidates: [sourceScript],
    }

    //#when
    const result = await deployDeepResearchScript(options)
    const targetScript = resolveDeepResearchTargetPath(pluginDir)

    //#then
    expect(result.status).toBe("deployed")
    expect(result.targetPath).toBe(targetScript)
    expect(result.sourcePath).toBe(sourceScript)
    expect(existsSync(targetScript)).toBe(true)
    expect(readFileSync(targetScript, "utf8")).toBe("console.log('deep-research source')\n")
  })

  test("skips when target already exists", async () => {
    //#given
    const pluginDir = join(tempRoot, "plugin")
    const targetScript = resolveDeepResearchTargetPath(pluginDir)
    mkdirSync(join(pluginDir, "scripts"), { recursive: true })
    writeFileSync(targetScript, "console.log('existing target')\n", "utf8")

    const sourceScript = join(tempRoot, "package", "scripts", "deep-research.mjs")
    mkdirSync(join(tempRoot, "package", "scripts"), { recursive: true })
    writeFileSync(sourceScript, "console.log('source should not overwrite')\n", "utf8")

    //#when
    const result = await deployDeepResearchScript({
      pluginDir,
      sourceCandidates: [sourceScript],
    })

    //#then
    expect(result.status).toBe("skipped")
    expect(result.reason).toBe("target_exists")
    expect(result.targetPath).toBe(targetScript)
    expect(readFileSync(targetScript, "utf8")).toBe("console.log('existing target')\n")
  })

  test("skips when target base dir unavailable", async () => {
    //#given
    const blockingFilePath = join(tempRoot, "blocked-parent")
    writeFileSync(blockingFilePath, "not a directory", "utf8")
    const pluginDir = join(blockingFilePath, "nested")

    const sourceScript = join(tempRoot, "package", "scripts", "deep-research.mjs")
    mkdirSync(join(tempRoot, "package", "scripts"), { recursive: true })
    writeFileSync(sourceScript, "console.log('source')\n", "utf8")

    //#when
    const result = await deployDeepResearchScript({
      pluginDir,
      sourceCandidates: [sourceScript],
    })

    //#then
    expect(result.status).toBe("skipped")
    expect(result.reason).toBe("target_base_unavailable")
    expect(result.targetPath).toBe(resolveDeepResearchTargetPath(pluginDir))
    expect(result.error).toBeDefined()
    expect(existsSync(resolveDeepResearchTargetPath(pluginDir))).toBe(false)
  })
})
