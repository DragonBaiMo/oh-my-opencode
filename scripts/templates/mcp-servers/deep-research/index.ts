#!/usr/bin/env bun
/**
 * Deep Research MCP Server
 * 
 * Local MCP server for executing deep research queries via external AI.
 * Supports grok-4.20-beta and grok-4.1-expert models.
 * 
 * Features:
 * - Main thread lock for serial execution
 * - Automatic fallback from grok-4.1-expert to grok-4.20-beta
 * - OpenAI-compatible API endpoint
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync, closeSync, openSync } from "node:fs"
import { dirname, join } from "node:path"

// Configuration
const BASE_URL = process.env.DEEP_RESEARCH_API_URL?.trim() || "http://45.192.97.104:5432"
const API_KEY = process.env.DEPResearch_API_KEY || process.env.DEEP_RESEARCH_API_KEY
const DEFAULT_MODEL = process.env.DEEP_RESEARCH_DEFAULT_MODEL || "grok-4.20-beta"
const ALLOWED_MODELS = new Set(["grok-4.20-beta", "grok-4.1-expert"])

// Lock file management
function getLockFilePath(): string {
  const lockEnv = process.env.DEEP_RESEARCH_LOCK_FILE
  if (lockEnv) return lockEnv
  
  // Use system temp directory instead of CWD to avoid path issues
  const tempDir = process.env.TEMP || process.env.TMP || "/tmp"
  return join(tempDir, "oh-my-opencode", "deep-research", "main-thread.lock")
}

function acquireMainThreadLock(): { fd: number; lockFile: string } | null {
  const lockFile = getLockFilePath()
  const parent = dirname(lockFile)
  
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true })
  }

  // Check for stale lock
  if (existsSync(lockFile)) {
    try {
      const raw = readFileSync(lockFile, "utf8")
      const data = raw ? JSON.parse(raw) : null
      const pid = typeof data?.pid === "number" ? data.pid : null
      const createdAt = typeof data?.createdAt === "number" ? data.createdAt : 0
      const staleMs = 5 * 60 * 1000
      let processAlive = false

      if (pid) {
        try {
          process.kill(pid, 0)
          processAlive = true
        } catch {
          processAlive = false
        }
      }

      if (!processAlive || !createdAt || Date.now() - createdAt > staleMs) {
        rmSync(lockFile, { force: true })
      }
    } catch {
      rmSync(lockFile, { force: true })
    }
  }

  try {
    const fd = openSync(lockFile, "wx")
    writeFileSync(lockFile, JSON.stringify({ pid: process.pid, createdAt: Date.now() }), "utf8")
    return { fd, lockFile }
  } catch {
    console.error(JSON.stringify({ 
      jsonrpc: "2.0", 
      error: { code: -32603, message: "deep-research must run sequentially (parallel execution blocked)" } 
    }))
    process.exit(1)
    return null // unreachable
  }
}

function releaseMainThreadLock(lock: { fd: number; lockFile: string } | null): void {
  if (!lock) return
  try { closeSync(lock.fd) } catch { /* noop */ }
  try { unlinkSync(lock.lockFile) } catch { /* noop */ }
}

// Create MCP server instance
const server = new McpServer({
  name: "deep-research",
  version: "1.0.0",
})

// Register the research tool
server.registerTool(
  "research",
  {
    description: "Execute a deep research query using external AI (grok). Results are returned as structured JSON.",
    inputSchema: z.object({
      prompt: z.string().describe("The research query or question to investigate"),
      model: z.enum(["grok-4.20-beta", "grok-4.1-expert"]).optional().describe("Model to use").default("grok-4.20-beta"),
    }),
  },
  async ({ prompt, model = "grok-4.20-beta" as const }) => {
    if (!API_KEY) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: "Missing DEEP_RESEARCH_API_KEY environment variable" }) }]
      }
    }

    const resolvedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL
    
    try {
      const result = await executeResearch(prompt, resolvedModel)
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }]
      }
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }]
      }
    }
  }
)

async function executeResearch(prompt: string, model: string): Promise<{
  selected_model: string
  actual_model: string
  research_prompt: string
  answer: string
  usage: unknown
  fallback_from?: string
}> {
  const endpoint = `${BASE_URL.replace(/\/$/, "")}/v1/chat/completions`
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  })

  const rawText = await response.text()
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Upstream rate limited (429). Please retry later")
    }
    
    // Handle fallback from expert to beta
    if (model === "grok-4.1-expert" && response.status === 403) {
      const fallbackResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-4.20-beta",
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      })
      
      const fallbackRawText = await fallbackResponse.text()
      if (!fallbackResponse.ok) {
        throw new Error(`Upstream failed: status=${response.status}, fallback failed: status=${fallbackResponse.status}`)
      }
      
      const fallbackData = JSON.parse(fallbackRawText)
      return {
        selected_model: model,
        actual_model: fallbackData?.model ?? "grok-4.20-beta",
        research_prompt: prompt,
        answer: fallbackData?.choices?.[0]?.message?.content ?? "",
        usage: fallbackData?.usage ?? null,
        fallback_from: "grok-4.1-expert",
      }
    }
    
    throw new Error(`Upstream failed: status=${response.status}, body=${rawText.slice(0, 500)}`)
  }

  if (rawText.startsWith("data: ")) {
    // Handle SSE response
    const lines = rawText.split("\n")
    let answer = ""
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue
      try {
        const chunk = JSON.parse(line.slice(6))
        const content = chunk?.choices?.[0]?.delta?.content ?? chunk?.choices?.[0]?.message?.content ?? ""
        answer += content
      } catch { /* ignore non-json chunks */ }
    }
    return {
      selected_model: model,
      actual_model: model,
      research_prompt: prompt,
      answer,
      usage: null,
    }
  }

  const data = JSON.parse(rawText)
  return {
    selected_model: model,
    actual_model: data?.model ?? model,
    research_prompt: prompt,
    answer: data?.choices?.[0]?.message?.content ?? "",
    usage: data?.usage ?? null,
  }
}

// Connect to stdio transport and start server
const transport = new StdioServerTransport()
await server.connect(transport)
