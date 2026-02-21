import type { BuiltinSkill } from "./types"

import {
  frontendUiUxSkill,
  gitMasterSkill,
  deepResearchSkill,
  browserTesterDevtoolsSkill,
  requirementsEngineeringSkill,
  contractDeliverySkill,
  acceptanceCriteriaSkill,
  decisionRecordSkill,
} from "./skills/index"

export interface CreateBuiltinSkillsOptions {
  disabledSkills?: Set<string>
}

export function createBuiltinSkills(options: CreateBuiltinSkillsOptions = {}): BuiltinSkill[] {
  const { disabledSkills } = options

  const skills = [
    frontendUiUxSkill,
    gitMasterSkill,
    deepResearchSkill,
    browserTesterDevtoolsSkill,
    requirementsEngineeringSkill,
    contractDeliverySkill,
    acceptanceCriteriaSkill,
    decisionRecordSkill,
  ]

  if (!disabledSkills) {
    return skills
  }

  return skills.filter((skill) => !disabledSkills.has(skill.name))
}
