#!/usr/bin/env bun
/**
 * Deep Search MCP Server
 * 
 * Combines grok AI research with Codex CLI web search.
 * Provides three tools:
 * - research: AI-powered research via grok
 * - web_search: Network search via Codex CLI
 * - deep_search: Combined workflow (search → research)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs"
import { dirname, join } from "node:path"

// Configuration
const DEEP_RESEARCH_BASE_URL = process.env.DEEP_RESEARCH_API_URL?.trim() || "http://45.192.97.104:5432"
const DEEP_RESEARCH_API_KEY = process.env.DEEP_RESEARCH_API_KEY || process.env.DEPResearch_API_KEY
const DEFAULT_RESEARCH_MODEL = "grok-4.20-beta"
const ALLOWED_MODELS = new Set(["grok-4.20-beta", "grok-4.1-expert"])

const CODEX_BIN = process.env.CODEX_BIN || (process.platform === "win32" 
  ? join(process.env.APPDATA || "", "npm", "codex.cmd")
  : "codex")
const BASE_DIR = process.env.CODEX_DEEP_SEARCH_BASE_DIR || join(process.cwd(), "codex-deep-search")
const RESULT_DIR = join(BASE_DIR, "data", "codex-search-results")

// Create MCP server instance
const server = new McpServer({
  name: "deep-search",
  version: "1.0.0",
})

// Tool 1: research - AI-powered research via grok
server.registerTool(
  "research",
  {
    description: "AI-powered deep research using grok. Good for analysis, explanation, and synthesis.",
    inputSchema: z.object({
      prompt: z.string().describe("Research query or question"),
      model: z.enum(["grok-4.20-beta", "grok-4.1-expert"]).optional().describe("Model to use").default("grok-4.20-beta"),
    }),
  },
  async ({ prompt, model = "grok-4.20-beta" }) => {
    if (!DEEP_RESEARCH_API_KEY) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: "Missing DEEP_RESEARCH_API_KEY environment variable" 
        }) }]
      }
    }

    const resolvedModel = ALLOWED_MODELS.has(model) ? model : DEFAULT_RESEARCH_MODEL

    try {
      const result = await executeResearch(prompt, resolvedModel)
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }]
      }
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: err instanceof Error ? err.message : String(err) 
        }) }]
      }
    }
  }
)

// Tool 2: web_search - Network search via Codex CLI
server.registerTool(
  "web_search",
  {
    description: "Network search using Codex CLI. Good for gathering current information from the web.",
    inputSchema: z.object({
      prompt: z.string().describe("Search query"),
      timeout: z.number().optional().describe("Timeout in seconds").default(120),
      output: z.string().optional().describe("Output file path"),
      taskName: z.string().optional().describe("Task identifier").default(`search-${Date.now()}`),
    }),
  },
  async ({ prompt, timeout = 120, output, taskName = `search-${Date.now()}` }) => {
    const outputPath = output || join(RESULT_DIR, `${taskName}.md`)

    // Ensure directories exist
    ensureDirExists(dirname(outputPath))

    try {
      const result = await executeWebSearch({ prompt, timeout, output: outputPath, taskName })
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }]
      }
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: err instanceof Error ? err.message : String(err) 
        }) }]
      }
    }
  }
)

// Tool 3: deep_search - Combined workflow
server.registerTool(
  "deep_search",
  {
    description: "Combined workflow: first search the web, then use AI to research and synthesize the findings.",
    inputSchema: z.object({
      prompt: z.string().describe("Research question"),
      searchTimeout: z.number().optional().describe("Search timeout in seconds").default(180),
      researchModel: z.enum(["grok-4.20-beta", "grok-4.1-expert"]).optional().describe("Research model").default("grok-4.20-beta"),
      includeSources: z.boolean().optional().describe("Include source URLs").default(true),
    }),
  },
  async ({ prompt, searchTimeout = 180, researchModel = "grok-4.20-beta", includeSources = true }) => {
    const taskName = `deep-search-${Date.now()}`
    const searchOutput = join(RESULT_DIR, `${taskName}.md`)

    ensureDirExists(dirname(searchOutput))

    try {
      // Step 1: Web search
      const searchResult = await executeWebSearch({ 
        prompt, 
        timeout: searchTimeout, 
        output: searchOutput, 
        taskName 
      })

      // Step 2: Read search results and do AI research
      let researchResult: any = { answer: "No search results to research" }
      let sources: string[] = []

      if (existsSync(searchOutput)) {
        const searchContent = readFileSync(searchOutput, "utf-8")
        
        // Extract URLs from markdown
        if (includeSources) {
          const urlRegex = /https?:\/\/[^\s\)\]]+/g
          sources = [...new Set(searchContent.match(urlRegex) || [])]
        }

        // Create research prompt from search results
        const researchPrompt = `Based on the following web search results, provide a comprehensive analysis:

Query: ${prompt}

Search Results:
${searchContent.slice(0, 8000)}

Please synthesize these findings and provide a detailed research report.`

        if (DEEP_RESEARCH_API_KEY) {
          try {
            researchResult = await executeResearch(researchPrompt, researchModel)
          } catch (err) {
            researchResult = { answer: `Research failed: ${err instanceof Error ? err.message : String(err)}` }
          }
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: true,
          searchResult,
          researchResult,
          sources: includeSources ? sources : undefined,
          workflow: "search_then_research"
        }) }]
      }
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: false, 
          error: err instanceof Error ? err.message : String(err) 
        }) }]
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
  const endpoint = `${DEEP_RESEARCH_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEP_RESEARCH_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  })

  const rawText = await response.text()

  if (!response.ok) {
    // Handle fallback from expert to beta
    if (model === "grok-4.1-expert" && response.status === 403) {
      const fallbackResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEP_RESEARCH_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-4.20-beta",
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      })

      const fallbackRawText = await fallbackResponse.text()
      if (!fallbackResponse.ok) {
        throw new Error(`Research failed: status=${response.status}, fallback failed: status=${fallbackResponse.status}`)
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

    throw new Error(`Research failed: status=${response.status}, body=${rawText.slice(0, 500)}`)
  }

  // Handle SSE or JSON response
  if (rawText.startsWith("data: ")) {
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

function ensureDirExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

async function executeWebSearch(options: {
  prompt: string
  timeout: number
  output: string
  taskName: string
}): Promise<{
  task_name: string
  output: string
  lines: number
  duration: string
  status: string
}> {
  const { prompt, timeout, output, taskName } = options
  const startedAt = new Date()

  // Check if Codex is available
  if (!existsSync(CODEX_BIN)) {
    throw new Error(`Codex CLI not found at: ${CODEX_BIN}. Please install Codex CLI or set CODEX_BIN environment variable.`)
  }

  // Build instruction for Codex
  const instruction = `You are a research assistant. Search the web for information about:

${prompt}

Key rules:
1. Write findings incrementally to ${output}, append after each search.
2. Start with a title and the query.
3. Keep search focused, maximum 8 web searches.
4. Include source URLs for each conclusion.
5. End with a brief summary section.`

  // Write initial report
  const header = `# Deep Search Report

**Query:** ${prompt}
**Status:** Running...
---
`
  writeFileSync(output, header, "utf-8")

  // Execute Codex CLI
  const isWindows = process.platform === "win32"
  const codexArgs = [
    "exec",
    "--model", "gpt-5.3-codex",
    "--full-auto",
    "--sandbox", "workspace-write",
    "-c", 'model_reasoning_effort="low"',
    instruction,
  ]

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(CODEX_BIN, codexArgs, {
      shell: isWindows && /\.cmd$|\.bat$/i.test(CODEX_BIN),
    })

    let timedOut = false
    const timeoutHandle = setTimeout(() => {
      timedOut = true
      proc.kill("SIGKILL")
    }, timeout * 1000)

    proc.stdout.on("data", (data) => {
      process.stdout.write(data)
    })

    proc.stderr.on("data", (data) => {
      process.stderr.write(data)
    })

    proc.on("error", (error) => {
      clearTimeout(timeoutHandle)
      reject(error)
    })

    proc.on("close", (code) => {
      clearTimeout(timeoutHandle)
      if (timedOut) {
        appendFileSync(output, `\n\n---\n_Search timed out after ${timeout} seconds_`, "utf-8")
      } else {
        appendFileSync(output, `\n\n---\n_Search completed at ${new Date().toISOString()}_`, "utf-8")
      }
      resolve()
    })
  })

  const endedAt = new Date()
  const elapsed = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const duration = `${minutes}m${seconds}s`

  // Count lines
  let lines = 0
  if (existsSync(output)) {
    lines = readFileSync(output, "utf-8").split("\n").length
  }

  return {
    task_name: taskName,
    output,
    lines,
    duration,
    status: "done",
  }
}

// Connect to stdio transport and start server
const transport = new StdioServerTransport()
await server.connect(transport)
