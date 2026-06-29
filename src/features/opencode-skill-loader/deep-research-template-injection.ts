import { existsSync } from "node:fs"
import { detectDeepResearchSourceCandidates } from "../../shared/deep-research-deployment"

const DEEP_RESEARCH_SCRIPT_PLACEHOLDER = "{{DEEP_RESEARCH_SCRIPT_PATH}}"
const DEEP_RESEARCH_MCP_PATH_PLACEHOLDER = "{{DEEP_RESEARCH_MCP_PATH}}"

/**
 * Resolves the deep research MCP server directory path.
 * Returns the directory containing the deep-research MCP server template.
 */
export function resolveDeepResearchMcpPath(moduleUrl: string = import.meta.url): string {
	const candidates = detectDeepResearchSourceCandidates({ moduleUrl })
	// For MCP, we want the mcp-servers/deep-research directory
	// Try to find the template in dist first, then fallback
	const resolved = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? "scripts/deep-research.mjs"
	return resolved.replace(/\\/g, "/")
}

/**
 * Injects the deep research script path into template.
 * @deprecated Use MCP-based deep-research instead
 */
export function injectDeepResearchScriptPath(template: string, moduleUrl: string = import.meta.url): string {
	const scriptPath = resolveDeepResearchScriptPath(moduleUrl)
	return template.replaceAll(DEEP_RESEARCH_SCRIPT_PLACEHOLDER, scriptPath)
}

/**
 * Injects the deep research MCP server directory path into template.
 * Replaces {{DEEP_RESEARCH_MCP_PATH}} with the resolved MCP server directory.
 */
export function injectDeepResearchMcpPath(template: string, moduleUrl: string = import.meta.url): string {
	const mcpPath = resolveDeepResearchMcpPath(moduleUrl)
	return template.replaceAll(DEEP_RESEARCH_MCP_PATH_PLACEHOLDER, mcpPath)
}

export function resolveDeepResearchScriptPath(moduleUrl: string = import.meta.url): string {
	const candidates = detectDeepResearchSourceCandidates({ moduleUrl })
	const resolved = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? "scripts/deep-research.mjs"
	return resolved.replace(/\\/g, "/")
}
