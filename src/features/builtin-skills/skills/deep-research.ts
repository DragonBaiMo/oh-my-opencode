import type { BuiltinSkill } from "../types"

export const deepResearchSkill: BuiltinSkill = {
  name: "deep-research",
  description:
    "深度调研工具 - 通过外部 AI 平台进行深度技术调研。当需要查询库文档、最新技术信息、最佳实践或解决不确定性问题时使用。默认使用 grok-4.20-beta，复杂问题可用 grok-4.1-expert。禁止多轮对话。",
  template: `# 深度调研工具 (Deep Research)

## 目的

通过调用外部深度调研 AI 平台，获取最新的技术文档、库使用方法、最佳实践等信息。

## 调用方式

使用 bash 工具执行深度调研脚本：

\`\`\`bash
node "{{DEEP_RESEARCH_SCRIPT_PATH}}" --model "grok-4.20-beta" --prompt "<你的问题>"
\`\`\`

说明：
- 此路径占位符会在技能加载时自动解析为当前机器上 oh-my-opencode 的实际脚本路径。
- 不要手动写死机器路径（如 \`I:/...\` 或 \`/Users/...\`）。
- 这样在不同工作目录、不同机器（Windows/macOS/Linux）都能直接使用。

**模型限制（强制）**：
- 只允许 \`grok-4.20-beta\` 和 \`grok-4.1-expert\`
- 默认使用 \`grok-4.20-beta\`
- 仅当问题特别复杂时使用 \`grok-4.1-expert\`
- **禁止多轮对话**（不允许 \`--create\` / \`--conversation\`）

**环境变量**：
- \`DEEP_RESEARCH_API_URL\`：默认 \`http://45.192.97.104:5432\`
- \`DEEP_RESEARCH_API_KEY\`：必须设置
- \`DEEP_RESEARCH_DEFAULT_MODEL\`：默认模型（建议 \`grok-4.20-beta\`）

## 调用前输出格式

在真正调用脚本前，先输出：

\`\`\`json
{
  "selected_model": "grok-4.20-beta | grok-4.1-expert",
  "research_prompt": "要发送的完整调研提示词"
}
\`\`\`

然后再调用脚本。

## 单轮调用（强制）

deep-research.mjs 现已禁用多轮对话：
- 不会返回 \`conversation_id\`
- 传入 \`--create\` 或 \`--conversation\` 会直接报错
- 需要追问时，必须把上轮结论写入新的 prompt，重新发起单轮请求

## 主线程串行调用（强制）

deep-research.mjs 仅允许主线程串行调用，不允许并行运行。
如果并发触发，会直接返回错误并拒绝执行。

## 返回格式

\`\`\`json
{
  "success": true,
  "selected_model": "grok-4.20-beta",
  "actual_model": "grok-4.20-beta",
  "research_prompt": "发送的提示词",
  "answer": "调研结果内容..."
}
\`\`\`

如果 expert 被上游拒绝，可能自动降级并返回：

\`\`\`json
{
  "success": true,
  "selected_model": "grok-4.1-expert",
  "actual_model": "grok-4.20-beta",
  "fallback_from": "grok-4.1-expert",
  "research_prompt": "发送的提示词",
  "answer": "调研结果内容..."
}
\`\`\`

如果调用失败：

\`\`\`json
{
  "success": false,
  "error": "错误信息"
}
\`\`\`
`,
  subtask: false,
  argumentHint: "调研问题",
}
