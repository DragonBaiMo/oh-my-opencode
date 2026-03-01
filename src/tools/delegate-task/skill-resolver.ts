import type { GitMasterConfig } from "../../config/schema"
import {
  extractSkillTemplate,
  getAllSkills,
  injectGitMasterConfig,
  injectDeepResearchScriptPath,
} from "../../features/opencode-skill-loader/skill-content"

function normalizeAgentName(agent?: string): string | undefined {
  return agent?.trim().toLowerCase()
}

function isSkillAllowedForTargetAgent(skillAgent: string | undefined, targetAgent: string | undefined): boolean {
  if (!skillAgent) {
    return true
  }
  if (!targetAgent) {
    return false
  }
  return normalizeAgentName(skillAgent) === normalizeAgentName(targetAgent)
}

export async function resolveSkillContent(
  skills: string[],
  options: {
    gitMasterConfig?: GitMasterConfig
    disabledSkills?: Set<string>
    includeClaudeCodePaths?: boolean
    directory?: string
    targetAgent?: string
  }
): Promise<{ content: string | undefined; contents: string[]; error: string | null }> {
  if (skills.length === 0) {
    return { content: undefined, contents: [], error: null }
  }

  const includeClaudeCodePaths = options.includeClaudeCodePaths ?? true
  const targetAgent = normalizeAgentName(options.targetAgent)
  const allSkills = await getAllSkills({
    gitMasterConfig: options.gitMasterConfig,
    disabledSkills: options.disabledSkills,
    includeClaudeCodePaths,
    directory: options.directory,
  })

  const skillMap = new Map(allSkills.map((skill) => [skill.name, skill]))
  const resolved = new Map<string, string>()
  const notFound: string[] = []
  const restricted: string[] = []

  for (const name of skills) {
    const skill = skillMap.get(name)
    if (!skill) {
      notFound.push(name)
      continue
    }

    if (!isSkillAllowedForTargetAgent(skill.definition.agent, targetAgent)) {
      restricted.push(`${name} (agent: ${skill.definition.agent})`)
      continue
    }

    const template = injectDeepResearchScriptPath(extractSkillTemplate(skill))
    if (name === "git-master") {
      resolved.set(name, injectGitMasterConfig(template, options.gitMasterConfig))
    } else {
      resolved.set(name, template)
    }
  }

  if (notFound.length > 0 || restricted.length > 0) {
    const available = allSkills
      .filter((skill) => isSkillAllowedForTargetAgent(skill.definition.agent, targetAgent))
      .map((skill) => skill.name)
      .join(", ")

    const issues: string[] = []
    if (notFound.length > 0) {
      issues.push(`Skills not found: ${notFound.join(", ")}`)
    }
    if (restricted.length > 0) {
      issues.push(`Skills restricted to other agents: ${restricted.join(", ")}`)
    }

    return {
      content: undefined,
      contents: [],
      error: `${issues.join(". ")}. Available: ${available || "none"}`,
    }
  }

  const contents = Array.from(resolved.values())
  return { content: contents.join("\n\n"), contents, error: null }
}
