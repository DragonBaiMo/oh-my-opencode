import type { BuiltinSkill } from "../types"

export const deepSearchSkill: BuiltinSkill = {
  name: "deep-search",
  description:
    "深度搜索与研究工具 - 整合 grok AI 研究和网络搜索。当需要综合网络信息和 AI 推理的复杂查询时使用。",
  agent: "librarian",
  template: `# 深度搜索工具 (Deep Search MCP)

整合 grok AI 深度研究与 Codex CLI 网络搜索的统一工具。

## 可用工具

### 1. research (AI 研究)

使用 grok AI 进行深度研究分析。

**输入：**
- \`prompt\` (string, 必需): 研究问题
- \`model\` (enum, 可选): \`grok-4.20-beta\` (默认) | \`grok-4.1-expert\`

### 2. web_search (网络搜索)

使用 Codex CLI 进行网络搜索收集最新信息。

**输入：**
- \`prompt\` (string, 必需): 搜索查询
- \`timeout\` (number, 可选): 超时秒数 (默认: 120)
- \`output\` (string, 可选): 输出文件路径

### 3. deep_search (深度搜索)

组合工作流：先进行网络搜索，再使用 AI 进行研究综合。适合需要综合网络信息的深度分析。

**输入：**
- \`prompt\` (string, 必需): 研究问题
- \`searchTimeout\` (number, 可选): 搜索超时 (默认: 180)
- \`researchModel\` (enum, 可选): 研究模型 (默认: grok-4.20-beta)
- \`includeSources\` (boolean, 可选): 是否包含来源 (默认: true)

## 使用场景

| 场景 | 推荐工具 |
|------|----------|
| 需要最新网络信息 | \`web_search\` |
| 需要 AI 推理分析 | \`research\` |
| 需要综合网络信息的深度分析 | \`deep_search\` |

## 调用方式

使用 \`skill_mcp\` 工具调用 deep-search MCP：

\`\`\`json
{
  "mcp_name": "deep-search",
  "tool_name": "research",
  "arguments": {
    "prompt": "解释量子计算的最新发展",
    "model": "grok-4.20-beta"
  }
}
\`\`\`

## 环境变量

- \`DEEP_RESEARCH_API_URL\`: grok API 地址 (默认: \`http://45.192.97.104:5432\`)
- \`DEEP_RESEARCH_API_KEY\`: grok API 密钥（必需）
- \`CODEX_BIN\`: Codex CLI 路径 (默认: 系统 PATH 中的 codex)
- \`CODEX_DEEP_SEARCH_BASE_DIR\`: 搜索结果目录

## 调用示例

**研究一个问题：**
\`\`\`json
{
  "mcp_name": "deep-search",
  "tool_name": "research",
  "arguments": {
    "prompt": "解释量子计算的最新发展"
  }
}
\`\`\`

**搜索网络信息：**
\`\`\`json
{
  "mcp_name": "deep-search",
  "tool_name": "web_search",
  "arguments": {
    "prompt": "最新 AI 代理技术进展",
    "timeout": 60
  }
}
\`\`\`

**深度搜索（组合）：**
\`\`\`json
{
  "mcp_name": "deep-search",
  "tool_name": "deep_search",
  "arguments": {
    "prompt": "2024年自动驾驶技术最新进展",
    "searchTimeout": 180,
    "researchModel": "grok-4.1-expert"
  }
}
\`\`\`
`,
  subtask: false,
  argumentHint: "研究问题",
}
