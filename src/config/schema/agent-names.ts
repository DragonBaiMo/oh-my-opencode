import { z } from "zod"

export const BuiltinAgentNameSchema = z.enum([
  "sisyphus",
  "hephaestus",
  "prometheus",
  "oracle",
  "librarian",
  "explore",
  "browser-tester",
  "multimodal-looker",
  "metis",
  "momus",
  "athena",
  "atlas",
])

export const BuiltinSkillNameSchema = z.enum([
  "frontend-ui-ux",
  "git-master",
  "deep-research",
  "browser-tester-devtools",
  "requirements-engineering",
  "contract-delivery",
  "acceptance-criteria",
  "decision-record",
])

export const OverridableAgentNameSchema = z.enum([
  "build",
  "plan",
  "sisyphus",
  "hephaestus",
  "sisyphus-junior",
  "OpenCode-Builder",
  "prometheus",
  "metis",
  "momus",
  "athena",
  "oracle",
  "librarian",
  "explore",
  "browser-tester",
  "multimodal-looker",
  "atlas",
])

export const AgentNameSchema = BuiltinAgentNameSchema
export type AgentName = z.infer<typeof AgentNameSchema>

export type BuiltinSkillName = z.infer<typeof BuiltinSkillNameSchema>
