---
name: deep-research
description: "深度调研工具 - 通过外部 AI 平台进行深度技术调研。当需要查询库文档、最新技术信息、最佳实践或解决不确定性问题时使用。替代所有网络搜索工具。"
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
node "${OPENCODE_PLUGIN_DIR}/scripts/deep-research.mjs" "<你的问题>"
```

**环境变量要求**：
- `DEEP_RESEARCH_API_URL`: OpenAI 兼容 API 的 baseURL（必需）
- `DEEP_RESEARCH_API_KEY`: API 密钥（必需）
- `DEEP_RESEARCH_MODEL`: 模型名称（可选，默认 gpt-4o）

## 执行流程

```
1. 构造调研问题
   ↓
2. 调用深度调研脚本
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

## 结果处理

调研结果会以 JSON 格式返回，包含：

```json
{
  "success": true,
  "answer": "调研结果内容...",
  "model": "使用的模型",
  "usage": { "prompt_tokens": 100, "completion_tokens": 500 }
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

## 与其他工具配合

| 任务类型 | 推荐工具 |
|----------|----------|
| 查找代码实现 | `gh repo clone` + 本地搜索 |
| 查询文档/最佳实践 | **deep-research** |
| 查看 Issue/PR | `gh search issues/prs` |
| 获取最新信息 | **deep-research** |
