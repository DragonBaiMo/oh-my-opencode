/**
 * Agent config keys to display names mapping.
 * Config keys are lowercase (e.g., "sisyphus", "atlas").
 * Display names include suffixes for UI/logs (e.g., "Sisyphus (Ultraworker)").
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  sisyphus: "Sisyphus (主编排器，负责任务协调和委派)",
  hephaestus: "Hephaestus (自主深度工作者，目标导向的端到端任务执行)",
  atlas: "Atlas (主编排器，通过task()完成todo列表中的所有任务)",
  prometheus: "Prometheus (规划智能体，负责生成工作计划)",
  "sisyphus-junior": "Sisyphus-Junior (聚焦任务执行器，执行委派任务)",
  metis: "Metis (预规划分析智能体，在规划前分析用户请求)",
  momus: "Momus (计划审查智能体，验证计划可执行性)",
  oracle: "Oracle (只读咨询智能体，高智商推理专家)",
  librarian: "Librarian (多仓库研究智能体，搜索远程代码库和文档)",
  explore: "Explore (快速代码库搜索智能体)",
  "multimodal-looker": "Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)",
  "browser-tester": "Browser-Tester (浏览器回归测试智能体，Chrome DevTools集成)",
}

/**
 * Chinese descriptions for agents (used in description field prefix)
 */
export const AGENT_CHINESE_DESCRIPTIONS: Record<string, string> = {
  sisyphus: "【主编排器】负责任务协调和委派",
  hephaestus: "【自主深度工作者】目标导向的端到端任务执行",
  atlas: "【主编排器】通过task()完成todo列表中的所有任务",
  prometheus: "【规划智能体】负责生成工作计划",
  "sisyphus-junior": "【聚焦任务执行器】执行委派任务",
  metis: "【预规划分析智能体】在规划前分析用户请求",
  momus: "【计划审查智能体】验证计划可执行性",
  oracle: "【只读咨询智能体】高智商推理专家",
  librarian: "【多仓库研究智能体】搜索远程代码库和文档",
  explore: "【快速代码库搜索智能体】",
  "multimodal-looker": "【媒体分析智能体】解析PDF、图片和图表",
  "browser-tester": "【浏览器回归测试智能体】Chrome DevTools集成",
}

/**
 * Get display name for an agent config key.
 * Uses case-insensitive lookup for backward compatibility.
 * Returns original key if not found.
 */
export function getAgentDisplayName(configKey: string): string {
  // Try exact match first
  const exactMatch = AGENT_DISPLAY_NAMES[configKey]
  if (exactMatch !== undefined) return exactMatch
  
  // Fall back to case-insensitive search
  const lowerKey = configKey.toLowerCase()
  for (const [k, v] of Object.entries(AGENT_DISPLAY_NAMES)) {
    if (k.toLowerCase() === lowerKey) return v
  }
  
  // Unknown agent: return original key
  return configKey
}

/**
 * Get Chinese description prefix for an agent.
 * Used to prepend to agent's description field.
 */
export function getAgentChineseDescription(configKey: string): string {
  const exactMatch = AGENT_CHINESE_DESCRIPTIONS[configKey]
  if (exactMatch !== undefined) return exactMatch
  
  const lowerKey = configKey.toLowerCase()
  for (const [k, v] of Object.entries(AGENT_CHINESE_DESCRIPTIONS)) {
    if (k.toLowerCase() === lowerKey) return v
  }
  
  return ""
}

const REVERSE_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(AGENT_DISPLAY_NAMES).map(([key, displayName]) => [displayName.toLowerCase(), key]),
)

/**
 * Resolve an agent name (display name or config key) to its lowercase config key.
 * "Atlas (Plan Executor)" → "atlas", "atlas" → "atlas", "unknown" → "unknown"
 */
export function getAgentConfigKey(agentName: string): string {
  const lower = agentName.toLowerCase()
  const reversed = REVERSE_DISPLAY_NAMES[lower]
  if (reversed !== undefined) return reversed
  if (AGENT_DISPLAY_NAMES[lower] !== undefined) return lower
  return lower
}