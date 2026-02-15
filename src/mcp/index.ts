import type { McpName } from "./types"

export { McpNameSchema, type McpName } from "./types"

type RemoteMcpConfig = {
  type: "remote"
  url: string
  enabled: boolean
  headers?: Record<string, string>
  oauth?: false
}

/**
 * Built-in MCPs have been removed.
 * MCP servers should be configured via Skill-embedded MCPs (SKILL.md frontmatter).
 */
export function createBuiltinMcps(
  _disabledMcps: string[] = [],
  _config?: unknown
): Record<string, RemoteMcpConfig> {
  return {}
}
