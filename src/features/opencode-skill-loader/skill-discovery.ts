import { createBuiltinSkills } from "../builtin-skills/skills"
import { discoverSkills } from "./loader"
import type { LoadedSkill } from "./types"
import type { SkillResolutionOptions } from "./skill-resolution-options"

const cachedSkillsByPathMode = new Map<string, LoadedSkill[]>()

export function clearSkillCache(): void {
	cachedSkillsByPathMode.clear()
}

export async function getAllSkills(options?: SkillResolutionOptions): Promise<LoadedSkill[]> {
	const includeClaudeCodePaths = options?.includeClaudeCodePaths ?? true
	const cacheKey = `${includeClaudeCodePaths}`
	const hasDisabledSkills = options?.disabledSkills && options.disabledSkills.size > 0

	// Skip cache if disabledSkills is provided (varies between calls)
	if (!hasDisabledSkills) {
		const cached = cachedSkillsByPathMode.get(cacheKey)
		if (cached) return cached
	}

	const [discoveredSkills, builtinSkillDefinitions] = await Promise.all([
		discoverSkills({ includeClaudeCodePaths, directory: options?.directory }),
		Promise.resolve(
			createBuiltinSkills({
				disabledSkills: options?.disabledSkills,
			})
		),
	])

	const builtinSkillsAsLoaded: LoadedSkill[] = builtinSkillDefinitions.map((skill) => ({
		name: skill.name,
		definition: {
			name: skill.name,
			description: skill.description,
			template: skill.template,
			model: skill.model,
			agent: skill.agent,
			subtask: skill.subtask,
		},
		scope: "builtin" as const,
		license: skill.license,
		compatibility: skill.compatibility,
		metadata: skill.metadata as Record<string, string> | undefined,
		allowedTools: skill.allowedTools,
		mcpConfig: skill.mcpConfig,
	}))

	const discoveredNames = new Set(discoveredSkills.map((skill) => skill.name))
	const uniqueBuiltins = builtinSkillsAsLoaded.filter((skill) => !discoveredNames.has(skill.name))

	let allSkills = [...discoveredSkills, ...uniqueBuiltins]

	// Filter discovered skills by disabledSkills (builtin skills are already filtered by createBuiltinSkills)
	if (hasDisabledSkills) {
		allSkills = allSkills.filter((skill) => !options!.disabledSkills!.has(skill.name))
	} else {
		cachedSkillsByPathMode.set(cacheKey, allSkills)
	}

	return allSkills
}
