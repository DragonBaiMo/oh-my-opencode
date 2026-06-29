import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

export interface EnsureMcpServersDirectoryResult {
  path: string
  created: boolean
}

/**
 * Ensures the .opencode/mcp-servers directory exists.
 * Returns the path and whether it was newly created.
 */
export function ensureMcpServersDirectory(projectRoot: string): EnsureMcpServersDirectoryResult {
  const mcpServersDir = join(projectRoot, ".opencode", "mcp-servers")

  const created = !existsSync(mcpServersDir)
  if (created) {
    mkdirSync(mcpServersDir, { recursive: true })
  }

  return {
    path: mcpServersDir,
    created,
  }
}
