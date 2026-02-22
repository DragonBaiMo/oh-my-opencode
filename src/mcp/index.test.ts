import { describe, expect, test } from "bun:test"
import { createBuiltinMcps } from "./index"

describe("createBuiltinMcps", () => {
  test("returns empty object when disabled_mcps is empty", () => {
    // given
    const disabledMcps: string[] = []

    // when
    const result = createBuiltinMcps(disabledMcps)

    // then
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("ignores disabled names and still returns empty object", () => {
    // given
    const disabledMcps = ["remote-docs"]

    // when
    const result = createBuiltinMcps(disabledMcps)

    // then
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("returns empty object when many names are disabled", () => {
    // given
    const disabledMcps = ["remote-search", "remote-docs", "code-search"]

    // when
    const result = createBuiltinMcps(disabledMcps)

    // then
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("ignores mixed disabled names in disabled_mcps", () => {
    // given
    const disabledMcps = ["remote-docs", "playwright", "custom"]

    // when
    const result = createBuiltinMcps(disabledMcps)

    // then
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("handles default argument", () => {
    // given
    // when
    const result = createBuiltinMcps()

    // then
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("ignores unknown MCP names", () => {
    // given
    const disabledMcps = ["playwright", "sqlite", "unknown-mcp"]

    // when
    const result = createBuiltinMcps(disabledMcps)

    // then
    expect(result).toEqual({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test("does not throw when legacy config shape is provided", () => {
    // given
    const disabledMcps: string[] = []
    const config = { legacy_provider: { provider: "tavily" as const } }

    // when
    const createMcps = () => createBuiltinMcps(disabledMcps, config)

    // then
    expect(createMcps).not.toThrow()
    expect(createMcps()).toEqual({})
  })
})
