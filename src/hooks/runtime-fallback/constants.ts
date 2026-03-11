/**
 * Runtime Fallback Hook - Constants
 *
 * Default values and configuration constants for the runtime fallback feature.
 */

import type { RuntimeFallbackConfig } from "../../config"

/**
 */
 export const DEFAULT_CONFIG: Required<RuntimeFallbackConfig> = {
  enabled: false,
  retry_on_errors: [429, 500, 502, 503, 504],
  strategy: "model",
  max_fallback_attempts: 3,
  cooldown_seconds: 60,
  timeout_seconds: 30,
  notify_on_fallback: true,
  loop_fallback: false,
}

/**
 * Error patterns that indicate rate limiting or temporary failures
 * These are checked in addition to HTTP status codes
 */
export const RETRYABLE_ERROR_PATTERNS = [
  /rate.?limit/i,
  /too.?many.?requests/i,
  /quota.?exceeded/i,
  /quota\s+will\s+reset\s+after/i,
  /all\s+credentials\s+for\s+model/i,
  /cool(?:ing)?\s+down/i,
  /exhausted\s+your\s+capacity/i,
  /usage\s+limit\s+has\s+been\s+reached/i,
  /service.?unavailable/i,
  /overloaded/i,
  /temporarily.?unavailable/i,
  /try.?again/i,
  /credit.*balance.*too.*low/i,
  /insufficient.?(?:credits?|funds?|balance)/i,
  /(?:^|\s)529(?:\s|$)/,
  /(?:^|\s)502(?:\s|$)/,
  /bad.?gateway/i,
  /json\s*parse\s*error/i,
  /json\s*parsing\s*failed/i,
  /ai_jsonparseerror/i,
  /chat\.completion\.chunk/i,
  /malformed\s+json/i,
]

/**
 * Hook name for identification and logging
 */
export const HOOK_NAME = "runtime-fallback"
