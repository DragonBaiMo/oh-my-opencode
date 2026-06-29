import type { BuiltinSkill } from "../types"

export const deepResearchSkill: BuiltinSkill = {
  name: "deep-research",
  description:
    "深度调研工具 - 通过本地 MCP Server 进行深度技术调研。当需要查询库文档、最新技术信息、最佳实践或解决不确定性问题时使用。默认使用 grok-4.20-beta，复杂问题可用 grok-4.1-expert。",
  agent: "librarian",
  template: `# 深度调研工具 (Deep Research MCP)

## 目的

通过本地 MCP Server 调用外部深度调研 AI 平台，获取最新的技术文档、库使用方法、最佳实践等信息。

## 调用方式

使用 \`skill_mcp\` 工具调用 deep-research MCP：

\`\`\`json
{
  "mcp_name": "deep-research",
  "tool_name": "research",
  "arguments": {
    "prompt": "<你的问题>",
    "model": "grok-4.20-beta"
  }
}
\`\`\`

## 工具说明

### research

执行深度调研查询。

**输入参数**：
- \`prompt\` (string, 必需): 调研查询内容
- \`model\` (enum, 可选): 使用模型 - \`grok-4.20-beta\` (默认) 或 \`grok-4.1-expert\`

**输出格式**：
\`\`\`json
{
  "success": true,
  "selected_model": "grok-4.20-beta",
  "actual_model": "grok-4.20-beta",
  "research_prompt": "要发送的完整调研提示词",
  "answer": "调研结果内容...",
  "usage": { "prompt_tokens": 100, "completion_tokens": 500 }
}
\`\`\`

如果 expert 被上游拒绝，可能自动降级：

\`\`\`json
{
  "success": true,
  "selected_model": "grok-4.1-expert",
  "actual_model": "grok-4.20-beta",
  "fallback_from": "grok-4.1-expert",
  "research_prompt": "...",
  "answer": "..."
}
\`\`\`

如果调用失败：

\`\`\`json
{
  "success": false,
  "error": "错误信息"
}
\`\`\`

## 模型限制

- 只允许 \`grok-4.20-beta\` 和 \`grok-4.1-expert\`
- 默认使用 \`grok-4.20-beta\`
- 仅当问题特别复杂时使用 \`grok-4.1-expert\`

## 环境变量

MCP Server 启动时会自动注入以下环境变量：

- \`DEEP_RESEARCH_API_URL\`: API 地址 (默认: \`http://45.192.97.104:5432\`)
- \`DEEP_RESEARCH_API_KEY\`: 必须设置
- \`DEEP_RESEARCH_DEFAULT_MODEL\`: 默认模型

## 架构说明

\`\`\`
用户请求 → Librarian Agent → skill_mcp 工具 → SkillMcpManager → deep-research MCP Server
\`\`\`

MCP Server 支持串行执行，自动处理并发冲突。

## 调用示例

**简单调研**：
\`\`\`json
{
  "mcp_name": "deep-research",
  "tool_name": "research",
  "arguments": {
    "prompt": "How to use React hooks in TypeScript?"
  }
}
\`\`\`

**复杂问题**：
\`\`\`json
{
  "mcp_name": "deep-research",
  "tool_name": "research",
  "arguments": {
    "prompt": "Explain the internals of V8 engine and JIT compilation",
    "model": "grok-4.1-expert"
  }
}
\`\`\`
`,
  subtask: false,
  argumentHint: "调研问题",
}
