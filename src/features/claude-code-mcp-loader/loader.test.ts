import { describe, it, expect } from "bun:test"
import { getSystemMcpServerNames, loadMcpConfigs, formatLoadedServersForToast } from "./loader"

describe("getSystemMcpServerNames (disabled)", () => {
  it("returns empty set - .mcp.json loading is disabled", () => {
    // when
    const names = getSystemMcpServerNames()

    // then
    expect(names).toBeInstanceOf(Set)
    expect(names.size).toBe(0)
  })
})

describe("loadMcpConfigs (disabled)", () => {
  it("returns empty result - .mcp.json loading is disabled", async () => {
    // when
    const result = await loadMcpConfigs()

    // then
    expect(result.servers).toEqual({})
    expect(result.loadedServers).toEqual([])
  })
})

describe("formatLoadedServersForToast", () => {
  it("returns empty string for empty array", () => {
    // when
    const result = formatLoadedServersForToast([])

    // then
    expect(result).toBe("")
  })

  it("formats loaded servers correctly", () => {
    // given
    const loadedServers = [
      { name: "server1", scope: "user" as const, config: { type: "local" as const, command: ["test"] } },
      { name: "server2", scope: "project" as const, config: { type: "remote" as const, url: "http://test" } },
    ]

    // when
    const result = formatLoadedServersForToast(loadedServers)

    // then
    expect(result).toBe("server1 (user), server2 (project)")
  })
})
