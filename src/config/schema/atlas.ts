import { z } from "zod"

export const AtlasConfigSchema = z.object({
  /** Inject single-task-only directive into delegated task prompts (default: true) */
  single_task_directive_enabled: z.boolean().default(true),
})

export type AtlasConfig = z.infer<typeof AtlasConfigSchema>
