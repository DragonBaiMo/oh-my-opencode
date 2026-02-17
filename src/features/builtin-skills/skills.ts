import type { BuiltinSkill } from "./types"
import type { BrowserAutomationProvider } from "../../config/schema"

import {
  frontendUiUxSkill,
  gitMasterSkill,
  deepResearchSkill,
  browserTesterDevtoolsSkill,
} from "./skills/index"

export interface CreateBuiltinSkillsOptions {
  browserProvider?: BrowserAutomationProvider
  disabledSkills?: Set<string>
}

export function createBuiltinSkills(options: CreateBuiltinSkillsOptions = {}): BuiltinSkill[] {
  const { disabledSkills } = options

  const skills = [
    frontendUiUxSkill,
    gitMasterSkill,
    deepResearchSkill,
    browserTesterDevtoolsSkill,
  ]

  if (!disabledSkills) {
    return skills
  }

  return skills.filter((skill) => !disabledSkills.has(skill.name))
}
