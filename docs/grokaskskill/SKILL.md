---
name: grok-ask
description: "通过 Grok 深度调研获取最新技术知识。当需要查询库文档、最新技术信息、最佳实践、解决不确定性问题、或任何超出训练数据范围的知识时应使用此技能。仅支持单轮提问（禁止多轮对话）。触发词：'调研'、'查一下'、'research'、'look up'、'what is the latest'、'best practice for'、'how to use [library]'。"
---

# Grok Ask — 深度调研技能

通过调用 Grok 大模型 API 进行深度技术调研，获取最新知识、文档、最佳实践。任何 AI 智能体均可通过此技能随时调用 Grok 来研究问题。

## 前置条件

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DEEP_RESEARCH_API_URL` | Grok API 的 OpenAI 兼容端点基础 URL（可选，不设时默认项目地址） | `http://45.192.97.104:5432` |
| `DEEP_RESEARCH_API_KEY` | API 密钥 | `xai-xxxxxxxxxxxx` |
| `DEEP_RESEARCH_DEFAULT_MODEL` | 默认模型（可选） | `grok-4.20-beta` |

### 运行环境

- Node.js 18+
- 脚本位置：本技能目录下 `scripts/deep-research.mjs`

## 可用模型

| 模型 | 用途 |
|------|------|
| `grok-4.20-beta` | **默认**。常规调研、文档查询、最佳实践 |
| `grok-4.1-expert` | 复杂问题：架构权衡、多源冲突、深度分析 |

**选择规则**：默认用 `grok-4.20-beta`。仅当问题确实复杂（多步推理、歧义架构决策）时才用 `grok-4.1-expert`。

## 调用方式

### 单次提问（最常用）

```bash
node "<skill_dir>/scripts/deep-research.mjs" --model "grok-4.20-beta" --prompt "你的具体问题"
```

### 复杂问题（仍为单轮）

```bash
node "<skill_dir>/scripts/deep-research.mjs" --model "grok-4.1-expert" --prompt "复杂问题（包含完整上下文）"
```

> `<skill_dir>` 替换为本 SKILL 所在目录的实际路径。

## 调用协议（强制）

### 调用前：输出决策 JSON

在执行脚本前，**必须**先输出以下 JSON 说明你的决策：

```json
{
  "selected_model": "grok-4.20-beta",
  "research_prompt": "要发送的完整调研问题"
}
```

### 串行执行（强制）

脚本内置文件锁，**禁止并行调用**。如果并发触发会直接报错。一次只能运行一个调研请求。

### 返回格式

成功：

```json
{
  "success": true,
  "selected_model": "grok-4.20-beta",
  "actual_model": "grok-4.20-beta",
  "research_prompt": "发送的问题",
  "answer": "调研结果...",
  "usage": { "prompt_tokens": 100, "completion_tokens": 500 }
}
```

expert 调用示例（单轮）：

```json
{
  "success": true,
  "selected_model": "grok-4.1-expert",
  "actual_model": "grok-4.1-expert",
  "research_prompt": "...",
  "answer": "..."
}
```

失败：

```json
{
  "success": false,
  "error": "错误信息"
}
```

### 降级处理

当 `grok-4.1-expert` 被上游拒绝（403）时，脚本会自动降级到 `grok-4.20-beta`。此时返回中会包含 `fallback_from` 字段。

## 对话规则

- 禁止多轮对话：不支持 `--create`、`--conversation`。
- 追问时需新发起一次单轮请求，并把上轮结论写入 prompt。

## 问题构造指南

### 好的问题

```
✅ "React 19 Server Components 的使用方法和最佳实践，包括数据获取模式和错误处理"
✅ "Node.js 22 中 fetch API 的完整用法，与 node-fetch 的区别，以及流式处理方式"
✅ "Prisma ORM 关联查询的 N+1 问题解决方案，包括 include vs select 的性能对比"
✅ "Bun 1.2 的 Windows 支持现状，已知限制和 workaround"
```

### 差的问题

```
❌ "React"（太宽泛）
❌ "怎么写代码"（不具体）
❌ "帮我实现登录页面"（这是实现任务，不是调研）
```

### 结构化问题模板（推荐用于复杂调研）

```markdown
## 调研主题
[一句话描述核心问题]

## 上下文背景
[当前任务、为什么需要这个信息、已知相关信息]

## 技术约束
- 技术栈：[语言/框架/版本]
- 运行环境：[OS/平台]
- 已有限制：[必须遵守的约束]

## 待澄清问题
1. [具体问题 1]
2. [具体问题 2]

## 期望输出
[代码示例 / 配置方式 / 最佳实践 / 对比分析]
```

## 使用场景

| 场景 | 示例 |
|------|------|
| 库/框架文档 | "React 19 的新特性有哪些？" |
| API 用法 | "如何使用 Stripe API 处理订阅？" |
| 最佳实践 | "TypeScript monorepo 的最佳目录结构？" |
| 版本差异 | "Next.js 14 和 15 的主要区别？" |
| 技术选型 | "Prisma vs Drizzle ORM 的优缺点对比" |
| 错误排查 | "ESM 和 CJS 混用导致的 ERR_REQUIRE_ESM 解决方案" |
| 最新信息 | "2026 年 Node.js LTS 版本的新特性" |

## 注意事项

1. **耐心等待**：调研可能需要 10 秒到 2 分钟，取决于问题复杂度
2. **问题质量**：问题越具体、上下文越充分，结果越有价值
3. **结果验证**：调研结果仅供参考，关键信息建议交叉验证
4. **成本意识**：每次调用消耗 API 额度，避免重复提问相同问题
5. **不要并行**：脚本有锁机制，并行调用会失败
