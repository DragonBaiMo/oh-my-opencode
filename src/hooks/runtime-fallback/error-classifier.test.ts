/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import { classifyErrorType, isRetryableError } from "./error-classifier"

describe("runtime-fallback/error-classifier", () => {
  test("classifies AI_JSONParseError as json_parse_error", () => {
    const error = {
      name: "AI_JSONParseError",
      message:
        "JSON parsing failed: Text: {\"object\":\"chat.completion.chunk\"}. Error message: JSON Parse error: Expected '}'",
    }

    expect(classifyErrorType(error)).toBe("json_parse_error")
  })

  test("treats JSON parse stream-chunk errors as retryable", () => {
    const error = {
      name: "AI_JSONParseError",
      message:
        "AI_JSONParseError: JSON parsing failed: ... chat.completion.chunk ... Expected '}'",
    }

    expect(isRetryableError(error, [429, 500, 502, 503, 504, 529])).toBe(true)
  })
})
