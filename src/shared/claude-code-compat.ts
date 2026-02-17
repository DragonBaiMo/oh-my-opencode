import type { ClaudeCodeConfig } from "../config/schema/claude-code"

/**
 * Check if a specific Claude Code compatibility feature is enabled.
 * When `enabled` is false, ALL features are disabled regardless of individual settings.
 */
export function isClaudeCodeFeatureEnabled(
  config: ClaudeCodeConfig | undefined,
  feature: keyof Omit<ClaudeCodeConfig, "enabled" | "plugins_override">
): boolean {
  if (!config) return true // Default: enabled
  if (config.enabled === false) return false // Master switch off
  return config[feature] ?? true // Individual feature default: enabled
}

/**
 * Check if Claude Code compatibility is globally enabled.
 */
export function isClaudeCodeEnabled(config: ClaudeCodeConfig | undefined): boolean {
  if (!config) return true
  return config.enabled !== false
}
