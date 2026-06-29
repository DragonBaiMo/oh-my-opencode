#!/usr/bin/env bun
/**
 * Hello World MCP Server
 * 
 * This is a minimal MCP server demonstrating the stdio transport pattern.
 * It provides a simple "echo" tool that returns the input text.
 * 
 * Usage:
 *   bun run index.ts
 *   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun run index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

// Create MCP server instance
const server = new McpServer({
  name: "hello-world",
  version: "1.0.0",
})

// Register the echo tool
server.registerTool(
  "echo",
  {
    description: "Echoes back the input text. Useful for testing MCP connectivity.",
    inputSchema: z.object({
      text: z.string().describe("The text to echo back"),
      uppercase: z.boolean().optional().describe("Whether to return uppercase text").default(false),
    }),
  },
  async ({ text, uppercase }) => {
    const result = uppercase ? text.toUpperCase() : text
    return {
      content: [
        {
          type: "text" as const,
          text: result,
        },
      ],
    }
  }
)

// Register a greeting tool
server.registerTool(
  "greet",
  {
    description: "Returns a greeting message",
    inputSchema: z.object({
      name: z.string().optional().describe("Name to greet").default("World"),
    }),
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: `Hello, ${name}!`,
        },
      ],
    }
  }
)

// Connect to stdio transport and start server
const transport = new StdioServerTransport()
await server.connect(transport)
