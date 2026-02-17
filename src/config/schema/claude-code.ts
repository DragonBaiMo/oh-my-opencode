import { z } from "zod"

export const ClaudeCodeConfigSchema = z.object({
  /** Master switch to disable ALL Claude Code compatibility features */
  enabled: z.boolean().optional(),
  mcp: z.boolean().optional(),
  commands: z.boolean().optional(),
  skills: z.boolean().optional(),
  agents: z.boolean().optional(),
  hooks: z.boolean().optional(),
  plugins: z.boolean().optional(),
  plugins_override: z.record(z.string(), z.boolean()).optional(),
})

export type ClaudeCodeConfig = z.infer<typeof ClaudeCodeConfigSchema>
