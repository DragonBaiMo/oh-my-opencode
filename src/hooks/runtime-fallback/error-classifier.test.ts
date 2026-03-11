import { describe, expect, test } from "bun:test"
import { classifyErrorType, extractAutoRetrySignal, isRetryableError } from "./error-classifier"

describe("runtime-fallback error classifier", () => {
  test("classifies AI_JSONParseError as json_parse_error", () => {
    //#given
    const error = {
      name: "AI_JSONParseError",
      message:
        "JSON parsing failed: Text: {\"object\":\"chat.completion.chunk\"}. Error message: JSON Parse error: Expected '}'",
    }

    //#when
    const errorType = classifyErrorType(error)

    //#then
    expect(errorType).toBe("json_parse_error")
  })

  test("treats JSON parse stream-chunk errors as retryable", () => {
    //#given
    const error = {
      name: "AI_JSONParseError",
      message:
        "AI_JSONParseError: JSON parsing failed: ... chat.completion.chunk ... Expected '}'",
    }

    //#when
    const retryable = isRetryableError(error, [429, 500, 502, 503, 504, 529])

    //#then
    expect(retryable).toBe(true)
  })

  test("detects cooling-down auto-retry status signals", () => {
    //#given
    const info = {
      status:
        "All credentials for model claude-opus-4-6-thinking are cooling down [retrying in ~5 days attempt #1]",
    }

    //#when
    const signal = extractAutoRetrySignal(info)

    //#then
    expect(signal).toBeDefined()
  })

  test("detects single-word cooldown auto-retry status signals", () => {
    //#given
    const info = {
      status:
        "All credentials for model claude-opus-4-6 are cooldown [retrying in 7m 56s attempt #1]",
    }

    //#when
    const signal = extractAutoRetrySignal(info)

    //#then
    expect(signal).toBeDefined()
  })

  test("treats cooling-down retry messages as retryable", () => {
    //#given
    const error = {
      message:
        "All credentials for model claude-opus-4-6-thinking are cooling down [retrying in ~5 days attempt #1]",
    }

    //#when
    const retryable = isRetryableError(error, [400, 403, 408, 429, 500, 502, 503, 504, 529])

    //#then
    expect(retryable).toBe(true)
  })

  test("ignores non-retry assistant status text", () => {
    //#given
    const info = {
      status: "Thinking...",
    }

    //#when
    const signal = extractAutoRetrySignal(info)

    //#then
    expect(signal).toBeUndefined()
  })
})
