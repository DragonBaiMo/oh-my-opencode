import type { GitMasterConfig } from "../../config/schema"

export interface SkillResolutionOptions {
	gitMasterConfig?: GitMasterConfig
	disabledSkills?: Set<string>
	/** Project directory to discover project-level skills from. Falls back to process.cwd() if not provided. */
	directory?: string
	/** Whether to include Claude Code paths (.claude/skills, ~/.claude/skills). Defaults to true. */
	includeClaudeCodePaths?: boolean
}
