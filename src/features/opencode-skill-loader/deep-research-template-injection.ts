import { existsSync } from "node:fs"
import { detectDeepResearchSourceCandidates } from "../../shared/deep-research-deployment"

const DEEP_RESEARCH_SCRIPT_PLACEHOLDER = "{{DEEP_RESEARCH_SCRIPT_PATH}}"

export function resolveDeepResearchScriptPath(moduleUrl: string = import.meta.url): string {
	const candidates = detectDeepResearchSourceCandidates({ moduleUrl })
	const resolved = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? "scripts/deep-research.mjs"
	return resolved.replace(/\\/g, "/")
}

export function injectDeepResearchScriptPath(template: string, moduleUrl: string = import.meta.url): string {
	const scriptPath = resolveDeepResearchScriptPath(moduleUrl)
	return template.replaceAll(DEEP_RESEARCH_SCRIPT_PLACEHOLDER, scriptPath)
}
