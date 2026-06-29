import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { McpServerInfo } from "../types"

const MCP_SERVERS_DIR = ".opencode/mcp-servers"

interface LocalMcpServerInfo extends McpServerInfo {
  path: string
  hasIndex: boolean
  hasMcpJson: boolean
}

function getLocalMcpServersDir(): string {
  return join(process.cwd(), MCP_SERVERS_DIR)
}

export function getLocalMcpServersInfo(): LocalMcpServerInfo[] {
  const serversDir = getLocalMcpServersDir()

  if (!existsSync(serversDir)) {
    return []
  }

  let entries: string[]
  try {
    entries = readdirSync(serversDir)
  } catch {
    return []
  }

  return entries
    .filter((name) => {
      const stat = existsSync(join(serversDir, name))
      return stat
    })
    .map((serverName) => {
      const serverPath = join(serversDir, serverName)
      const indexPath = join(serverPath, "index.ts")
      const mcpJsonPath = join(serverPath, "mcp.json")

      const hasIndex = existsSync(indexPath)
      const hasMcpJson = existsSync(mcpJsonPath)

      let valid = false
      let error: string | undefined

      if (!hasIndex && !hasMcpJson) {
        error = "Missing both index.ts and mcp.json"
      } else if (hasMcpJson) {
        try {
          const content = readFileSync(mcpJsonPath, "utf-8")
          JSON.parse(content)
          valid = true
        } catch {
          error = "Invalid mcp.json (not valid JSON)"
        }
      } else {
        valid = hasIndex
      }

      return {
        id: serverName,
        type: "local" as const,
        path: serverPath,
        enabled: true,
        valid,
        error,
        hasIndex,
        hasMcpJson,
      }
    })
}
