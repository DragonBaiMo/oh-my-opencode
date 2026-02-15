import type {
  LoadedMcpServer,
  McpLoadResult,
} from "./types"

/**
 * .mcp.json loading has been disabled.
 * MCP servers should be configured via Skill-embedded MCPs (SKILL.md frontmatter).
 */
export function getSystemMcpServerNames(): Set<string> {
  return new Set<string>()
}

/**
 * .mcp.json loading has been disabled.
 * MCP servers should be configured via Skill-embedded MCPs (SKILL.md frontmatter).
 */
export async function loadMcpConfigs(): Promise<McpLoadResult> {
  return { servers: {}, loadedServers: [] }
}

export function formatLoadedServersForToast(
  loadedServers: LoadedMcpServer[]
): string {
  if (loadedServers.length === 0) return ""

  return loadedServers
    .map((server) => `${server.name} (${server.scope})`)
    .join(", ")
}
