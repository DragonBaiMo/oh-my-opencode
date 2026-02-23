---
name: deep-research
description: "深度调研工具 - 通过外部 AI 平台进行深度技术调研。当需要查询库文档、最新技术信息、最佳实践或解决不确定性问题时使用。替代所有网络搜索工具。默认使用 grok-4.20-beta，复杂问题可用 grok-4.1-expert。禁止多轮对话。"
---

# 深度调研工具 (Deep Research)

## 目的

通过调用外部深度调研 AI 平台，获取最新的技术文档、库使用方法、最佳实践等信息。

## 使用场景

| 场景 | 示例 |
|------|------|
| 库/框架文档查询 | "React 19 的新特性有哪些？" |
| API 使用方法 | "如何使用 OpenAI API 进行流式输出？" |
| 最佳实践 | "TypeScript 项目的最佳目录结构是什么？" |
| 版本差异 | "Next.js 14 和 15 的主要区别？" |
| 技术决策 | "Prisma vs Drizzle ORM 的优缺点对比" |
| 错误排查 | "解决 'Cannot find module' 错误的方法" |

## 调用方式

使用 bash 工具执行深度调研脚本：

```bash
node "<oh-my-opencode安装目录>/scripts/deep-research.mjs" --model "grok-4.20-beta" --prompt "<你的问题>"
```

说明：
- 不要写死机器路径（如 `I:/...`）。
- 始终使用当前环境中 **oh-my-opencode 的实际安装目录**。
- Librarian 已改为运行时自动解析该目录并调用对应 `scripts/deep-research.mjs`。

**模型限制（强制）**：
- 只允许 `grok-4.20-beta` 和 `grok-4.1-expert`
- 默认使用 `grok-4.20-beta`
- 仅当问题特别复杂时使用 `grok-4.1-expert`
- **禁止多轮对话**（不允许 `--create` / `--conversation`）

**环境变量**：
- `DEEP_RESEARCH_API_URL`：默认 `http://45.192.97.104:5432`
- `DEEP_RESEARCH_API_KEY`：必须设置
- `DEEP_RESEARCH_DEFAULT_MODEL`：默认模型（建议 `grok-4.20-beta`）

## 调用前输出格式

在真正调用脚本前，先输出：

```json
{
  "selected_model": "grok-4.20-beta | grok-4.1-expert",
  "research_prompt": "要发送的完整调研提示词"
}
```

然后再调用脚本。

## 单轮调用（强制）

deep-research.mjs 现已**禁用多轮对话**：

- 不会返回 `conversation_id`
- 传入 `--create` 或 `--conversation` 会直接报错
- 需要追问时，必须把上轮结论作为上下文写入新的 prompt，重新发起单轮请求

## 主线程串行调用（强制）

deep-research.mjs 仅允许主线程串行调用，不允许并行运行。
如果并发触发，会直接返回错误并拒绝执行。

## 执行流程

```
1. 构造调研问题（必要时把已有上下文完整写入）
   ↓
2. 调用深度调研脚本（单轮）
   ↓
3. 等待 API 响应（可能需要较长时间）
   ↓
4. 解析并整合调研结果
   ↓
5. 继续原任务
```

## 问题构造指南

### 好的问题示例

```
✅ "React useEffect 的依赖数组最佳实践，包括常见陷阱和解决方案"
✅ "Node.js 20 中 fetch API 的使用方法和与 node-fetch 的区别"
✅ "TypeScript 5.0 的 decorators 新语法和迁移指南"
```

### 避免的问题

```
❌ "React" （太宽泛）
❌ "怎么写代码" （不具体）
❌ "帮我写一个登录页面" （这是实现任务，不是调研）
```

### 参考问问题的格式

```md
## 调研主题
我正在进行 {任务描述}，遇到以下技术问题：[一句话描述核心问题]

## 上下文背景
【背景】{上下文背景} [当前任务、为什么需要这个信息、已知相关信息]

## 技术约束
【技术环境】
- 技术栈：[语言/框架/版本]（如有）
- 运行环境：[OS/平台/依赖]（如有）
- 已有限制：[必须遵守的约束]（如有）

## 待澄清问题
1. [具体问题 1]
2. [具体问题 2]
{待澄清问题列表}

## 期望输出
请提供 {期望输出}。如有多种方案，请说明优缺点和适用场景:[代码示例/配置方式/最佳实践/对比分析等]

```

## 结果处理

调研结果会以 JSON 格式返回，包含：

```json
{
  "success": true,
  "selected_model": "grok-4.20-beta",
  "actual_model": "grok-4.20-beta",
  "research_prompt": "发送的提示词",
  "answer": "调研结果内容...",
  "usage": { "prompt_tokens": 100, "completion_tokens": 500 }
}
```

如果 expert 调用被上游拒绝，可能自动降级：

```json
{
  "success": true,
  "selected_model": "grok-4.1-expert",
  "actual_model": "grok-4.20-beta",
  "fallback_from": "grok-4.1-expert",
  "research_prompt": "发送的提示词",
  "answer": "调研结果内容..."
}
```

如果调用失败：

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 注意事项

1. **耐心等待**：深度调研可能需要 30 秒到几分钟
2. **问题质量**：问题越具体，结果越有价值
3. **结果验证**：调研结果仅供参考，关键信息需要验证
4. **成本意识**：每次调用都会消耗 API 额度
5. **单轮限制**：追问必须重发新请求，并在 prompt 中补充上下文

## 与其他工具配合

| 任务类型 | 推荐工具 |
|----------|----------|
| 查找代码实现 | `gh repo clone` + 本地搜索 |
| 查询文档/最佳实践 | **deep-research** |
| 查看 Issue/PR | `gh search issues/prs` |
| 获取最新信息 | **deep-research** |
