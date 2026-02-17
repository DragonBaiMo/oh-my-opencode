#!/usr/bin/env node

/**
 * Deep Research client (Node.js 18+)
 * - No system prompt.
 * - Only two models: grok-4.1-thinking / grok-4.1-thinking.1-expert.
 * - OpenAI-compatible /v1/chat/completions.
 */

import crypto from "node:crypto"
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"

const BASE_URL = process.env.DEEP_RESEARCH_API_URL
const API_KEY = process.env.DEEP_RESEARCH_API_KEY
const DEFAULT_MODEL = process.env.DEEP_RESEARCH_DEFAULT_MODEL || "grok-4.1-thinking"
const ALLOWED_MODELS = new Set(["grok-4.1-thinking", "grok-4.1-thinking.1-expert"])

function getSessionStorePath() {
  return (
    process.env.DEEP_RESEARCH_SESSION_FILE ||
    join(process.cwd(), ".opencode", "deep-research", "sessions.json")
  )
}

function getLockFilePath() {
  return (
    process.env.DEEP_RESEARCH_LOCK_FILE ||
    join(process.cwd(), ".opencode", "deep-research", "main-thread.lock")
  )
}

// Session store (memory + disk for cross-invocation continuity)
const sessions = loadSessions()

function loadSessions() {
  const storePath = getSessionStorePath()
  if (!existsSync(storePath)) {
    return new Map()
  }

  try {
    const raw = readFileSync(storePath, "utf8")
    if (!raw.trim()) return new Map()
    const parsed = JSON.parse(raw)
    const map = new Map()
    for (const [conversationId, rawSession] of Object.entries(parsed)) {
      if (Array.isArray(rawSession)) {
        // Backward-compatible migration: old format meant non-heavy history.
        map.set(conversationId, {
          selected_model: "grok-4.1-thinking",
          last_actual_model: "grok-4.1-thinking",
          history: rawSession,
        })
        continue
      }

      if (
        rawSession &&
        typeof rawSession === "object" &&
        Array.isArray(rawSession.history)
      ) {
        map.set(conversationId, {
          selected_model:
            rawSession.selected_model === "grok-4.1-thinking.1-expert"
              ? "grok-4.1-thinking.1-expert"
              : "grok-4.1-thinking",
          last_actual_model:
            rawSession.last_actual_model === "grok-4.1-thinking.1-expert"
              ? "grok-4.1-thinking.1-expert"
              : "grok-4.1-thinking",
          history: rawSession.history,
        })
        continue
      }

      map.set(conversationId, {
        selected_model: "grok-4.1-thinking",
        last_actual_model: "grok-4.1-thinking",
        history: [],
      })
    }
    return map
  } catch {
    return new Map()
  }
}

function saveSessions() {
  const storePath = getSessionStorePath()
  const parent = dirname(storePath)
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true })
  }

  const serialized = Object.fromEntries(sessions)
  writeFileSync(storePath, JSON.stringify(serialized, null, 2), "utf8")
}

function acquireMainThreadLock() {
  const lockFile = getLockFilePath()
  const parent = dirname(lockFile)
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true })
  }

  // stale lock recovery (e.g., previous crash)
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
    writeFileSync(
      lockFile,
      JSON.stringify({ pid: process.pid, createdAt: Date.now() }),
      "utf8"
    )
    return {
      fd,
      lockFile,
    }
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
  const model = (modelArg || DEFAULT_MODEL || "grok-4.1-thinking").trim()
  if (!ALLOWED_MODELS.has(model)) {
    fail(`Unsupported model: ${model}. Allowed models: grok-4.1-thinking, grok-4.1-thinking.1-expert`)
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

export function createConversation(selectedModel) {
  if (selectedModel !== "grok-4.1-thinking.1-expert") {
    fail("conversation_id is allowed only for grok-4.1-thinking.1-expert")
  }

  const conversation_uuid = crypto.randomUUID()
  sessions.set(conversation_uuid, {
    selected_model: selectedModel,
    last_actual_model: null,
    history: [],
  })
  saveSessions()
  return conversation_uuid
}

async function requestCompletion(messages, model) {
  if (!BASE_URL) {
    fail("Missing environment variable: DEEP_RESEARCH_API_URL")
  }

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

    let shouldFallbackFromHeavy = false
    if (model === "grok-4.1-thinking.1-expert") {
      if (response.status === 403) {
        shouldFallbackFromHeavy = true
      } else {
        try {
          const errorPayload = JSON.parse(rawText)
          const errorCode = errorPayload?.error?.code
          const errorMessage = String(errorPayload?.error?.message || "")
          shouldFallbackFromHeavy =
            errorCode === "upstream_error" && /\b403\b/.test(errorMessage)
        } catch {
          shouldFallbackFromHeavy = false
        }
      }
    }

    if (shouldFallbackFromHeavy) {
      const fallbackResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-4.1-thinking",
          messages,
          stream: false,
        }),
      })

      const fallbackRawText = await fallbackResponse.text()
      if (!fallbackResponse.ok) {
        fail(
          `Upstream failed: status=${response.status}, body=${rawText}; fallback failed: status=${fallbackResponse.status}, body=${fallbackRawText}`
        )
      }

      if (fallbackRawText.startsWith("data: ")) {
        return {
          answer: parseSseResponse(fallbackRawText),
          usage: null,
          model: "grok-4.1-thinking",
          fallback_from: "grok-4.1-thinking.1-expert",
        }
      }

      const fallbackData = JSON.parse(fallbackRawText)
      return {
        answer: fallbackData?.choices?.[0]?.message?.content ?? "",
        usage: fallbackData?.usage ?? null,
        model: fallbackData?.model ?? "grok-4.1-thinking",
        fallback_from: "grok-4.1-thinking.1-expert",
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

export async function chat(conversation_uuid, userText, model) {
  if (model !== "grok-4.1-thinking.1-expert") {
    fail("conversation_id follow-up is allowed only with --model grok-4.1-thinking.1-expert")
  }

  const session = sessions.get(conversation_uuid)
  if (!session) {
    fail(`conversation_uuid not found: ${conversation_uuid}`)
  }

  if (session.selected_model !== "grok-4.1-thinking.1-expert") {
    fail("This conversation was created by non-heavy model. Re-run without --conversation and use --model grok-4.1-thinking.1-expert")
  }

  const isFollowUp = session.history.length > 0
  if (isFollowUp && session.last_actual_model !== "grok-4.1-thinking.1-expert") {
    sessions.delete(conversation_uuid)
    saveSessions()
    fail("Previous call used non-heavy actual model. Start a new heavy call without --conversation")
  }

  session.history.push({ role: "user", content: userText })
  const {
    answer,
    usage,
    model: actualModel,
    fallback_from,
  } = await requestCompletion(session.history, model)
  session.history.push({ role: "assistant", content: answer })
  session.last_actual_model = actualModel

  if (actualModel !== "grok-4.1-thinking.1-expert") {
    sessions.delete(conversation_uuid)
    saveSessions()
    return {
      selected_model: model,
      actual_model: actualModel,
      ...(fallback_from ? { fallback_from } : {}),
      research_prompt: userText,
      answer,
      usage,
      restart_required: true,
      note: "conversation_id disabled because actual model is non-heavy; start a new heavy call for follow-up",
    }
  }

  saveSessions()

  return {
    conversation_uuid,
    conversation_id: conversation_uuid,
    selected_model: model,
    actual_model: actualModel,
    ...(fallback_from ? { fallback_from } : {}),
    research_prompt: userText,
    answer,
    usage,
  }
}

export async function askOnce(researchPrompt, model) {
  if (model === "grok-4.1-thinking.1-expert") {
    const conversation_uuid = createConversation(model)
    return chat(conversation_uuid, researchPrompt, model)
  }

  const {
    answer,
    usage,
    model: actualModel,
    fallback_from,
  } = await requestCompletion(
    [{ role: "user", content: researchPrompt }],
    model
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

  if (args.create) {
    if (selectedModel !== "grok-4.1-thinking.1-expert") {
      fail("--create is allowed only with --model grok-4.1-thinking.1-expert")
    }

    const conversation_uuid = createConversation(selectedModel)
    printJson({
      success: true,
      conversation_uuid,
      conversation_id: conversation_uuid,
      note: "Use this id with --conversation for follow-up questions",
    })
    return
  }

  const researchPrompt = args.prompt.trim()
  if (!researchPrompt) {
    fail("Usage: node scripts/deep-research.mjs --prompt \"...\" [--model grok-4.1-thinking|grok-4.1-thinking.1-expert] [--conversation <uuid>]")
  }

  const result = args.conversation
    ? await chat(args.conversation, researchPrompt, selectedModel)
    : await askOnce(researchPrompt, selectedModel)

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
