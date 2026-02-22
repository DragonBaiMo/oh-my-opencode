#!/usr/bin/env node

/**
 * Deep Research client (Node.js 18+)
 * - No system prompt.
 * - Only two models: grok-4.20-beta / grok-4.1-expert.
 * - OpenAI-compatible /v1/chat/completions.
 * - Multi-turn conversation is disabled.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"

const BASE_URL = process.env.DEEP_RESEARCH_API_URL?.trim() || "http://45.192.97.104:5432"
const API_KEY = process.env.DEEP_RESEARCH_API_KEY
const DEFAULT_MODEL = process.env.DEEP_RESEARCH_DEFAULT_MODEL || "grok-4.20-beta"
const ALLOWED_MODELS = new Set(["grok-4.20-beta", "grok-4.1-expert"])

function getLockFilePath() {
  return (
    process.env.DEEP_RESEARCH_LOCK_FILE ||
    join(process.cwd(), ".opencode", "deep-research", "main-thread.lock")
  )
}

function acquireMainThreadLock() {
  const lockFile = getLockFilePath()
  const parent = dirname(lockFile)
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true })
  }

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
    fail("deep-research.mjs must run sequentially on main thread (parallel execution is blocked)")
  }
}

function releaseMainThreadLock(lock) {
  if (!lock) return

  try {
    closeSync(lock.fd)
  } catch {
    // noop
  }

  try {
    unlinkSync(lock.lockFile)
  } catch {
    // noop
  }
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2))
}

function fail(message) {
  throw new Error(message)
}

function exitWithError(message) {
  printJson({ success: false, error: message })
  process.exit(1)
}

function parseArgs(argv) {
  const args = {
    prompt: "",
    model: "",
    conversation: "",
    create: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i]

    if (token === "--create") {
      args.create = true
      continue
    }

    if (token === "--model") {
      args.model = argv[i + 1] || ""
      i++
      continue
    }

    if (token === "--conversation") {
      args.conversation = argv[i + 1] || ""
      i++
      continue
    }

    if (token === "--prompt") {
      args.prompt = argv[i + 1] || ""
      i++
      continue
    }

    if (!token.startsWith("--")) {
      args.prompt = args.prompt ? `${args.prompt} ${token}` : token
    }
  }

  return args
}

function resolveModel(modelArg) {
  const model = (modelArg || DEFAULT_MODEL || "grok-4.20-beta").trim()
  if (!ALLOWED_MODELS.has(model)) {
    fail(`Unsupported model: ${model}. Allowed models: grok-4.20-beta, grok-4.1-expert`)
  }

  return model
}

function parseSseResponse(rawText) {
  const lines = rawText.split("\n")
  let answer = ""

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue

    const payload = line.slice(6).trim()
    if (!payload || payload === "[DONE]") continue

    try {
      const chunk = JSON.parse(payload)
      const content =
        chunk?.choices?.[0]?.delta?.content ??
        chunk?.choices?.[0]?.message?.content ??
        ""
      answer += content
    } catch {
      // ignore non-json chunks
    }
  }

  return answer
}

async function requestCompletion(messages, model) {
  if (!API_KEY) {
    fail("Missing environment variable: DEEP_RESEARCH_API_KEY")
  }

  const endpoint = `${BASE_URL.replace(/\/$/, "")}/v1/chat/completions`
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  })

  const rawText = await response.text()
  if (!response.ok) {
    if (response.status === 429) {
      fail("Upstream rate limited (429). Please retry later")
    }

    let shouldFallbackFromExpert = false
    if (model === "grok-4.1-expert") {
      if (response.status === 403) {
        shouldFallbackFromExpert = true
      } else {
        try {
          const errorPayload = JSON.parse(rawText)
          const errorCode = errorPayload?.error?.code
          const errorMessage = String(errorPayload?.error?.message || "")
          shouldFallbackFromExpert =
            errorCode === "upstream_error" && /\b403\b/.test(errorMessage)
        } catch {
          shouldFallbackFromExpert = false
        }
      }
    }

    if (shouldFallbackFromExpert) {
      const fallbackResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-4.20-beta",
          messages,
          stream: false,
        }),
      })

      const fallbackRawText = await fallbackResponse.text()
      if (!fallbackResponse.ok) {
        fail(
          `Upstream failed: status=${response.status}, body=${rawText}; fallback failed: status=${fallbackResponse.status}, body=${fallbackRawText}`,
        )
      }

      if (fallbackRawText.startsWith("data: ")) {
        return {
          answer: parseSseResponse(fallbackRawText),
          usage: null,
          model: "grok-4.20-beta",
          fallback_from: "grok-4.1-expert",
        }
      }

      const fallbackData = JSON.parse(fallbackRawText)
      return {
        answer: fallbackData?.choices?.[0]?.message?.content ?? "",
        usage: fallbackData?.usage ?? null,
        model: fallbackData?.model ?? "grok-4.20-beta",
        fallback_from: "grok-4.1-expert",
      }
    }

    fail(`Upstream failed: status=${response.status}, body=${rawText}`)
  }

  if (rawText.startsWith("data: ")) {
    return {
      answer: parseSseResponse(rawText),
      usage: null,
      model,
    }
  }

  const data = JSON.parse(rawText)
  return {
    answer: data?.choices?.[0]?.message?.content ?? "",
    usage: data?.usage ?? null,
    model: data?.model ?? model,
  }
}

export async function askOnce(researchPrompt, model) {
  const { answer, usage, model: actualModel, fallback_from } = await requestCompletion(
    [{ role: "user", content: researchPrompt }],
    model,
  )

  return {
    selected_model: model,
    actual_model: actualModel,
    ...(fallback_from ? { fallback_from } : {}),
    research_prompt: researchPrompt,
    answer,
    usage,
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const selectedModel = resolveModel(args.model)

  if (args.create || args.conversation) {
    fail("Multi-turn conversation is disabled. --create and --conversation are not supported")
  }

  const researchPrompt = args.prompt.trim()
  if (!researchPrompt) {
    fail("Usage: node scripts/deep-research.mjs --prompt \"...\" [--model grok-4.20-beta|grok-4.1-expert]")
  }

  const result = await askOnce(researchPrompt, selectedModel)
  printJson({ success: true, ...result })
}

async function runCli() {
  let mainThreadLock

  try {
    mainThreadLock = acquireMainThreadLock()
    await main()
  } catch (err) {
    exitWithError(`Request error: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    releaseMainThreadLock(mainThreadLock)
  }
}

runCli()
