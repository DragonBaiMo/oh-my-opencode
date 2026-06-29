---
name: deep-search
description: 深度搜索与研究工具 - 整合 grok AI 研究和网络搜索。适用于需要综合网络信息和 AI 推理的复杂查询。
agent: librarian
tools:
  - Bash
mcp:
  deep-search:
    command: bun
    args:
      - run
      - "{{directory}}/index.ts"
    env:
      DEEP_RESEARCH_API_URL: "${DEEP_RESEARCH_API_URL:-http://45.192.97.104:5432}"
      DEEP_RESEARCH_API_KEY: "${DEEP_RESEARCH_API_KEY}"
      CODEX_BIN: "${CODEX_BIN}"
      CODEX_DEEP_SEARCH_BASE_DIR: "${CODEX_DEEP_SEARCH_BASE_DIR}"
---

# Deep Search MCP Server

整合深度研究与网络搜索的统一工具。

## 可用工具

### 1. research (AI 研究)

使用 grok AI 进行深度研究。

**输入：**
- `prompt` (string, 必需): 研究问题
- `model` (enum, 可选): `grok-4.20-beta` (默认) | `grok-4.1-expert`

**输出：**
```json
{
  "success": true,
  "selected_model": "grok-4.20-beta",
  "answer": "AI 生成的研究结论..."
}
```

### 2. web_search (网络搜索)

使用 Codex CLI 进行网络搜索。

**输入：**
- `prompt` (string, 必需): 搜索查询
- `timeout` (number, 可选): 超时秒数 (默认: 120)
- `output` (string, 可选): 输出文件路径

**输出：**
```json
{
  "success": true,
  "task_name": "search-1234567890",
  "output": "/path/to/result.md",
  "lines": 150,
  "duration": "2m30s"
}
```

### 3. deep_search (深度搜索)

组合工作流：先进行网络搜索，再使用 AI 进行研究综合。

**输入：**
- `prompt` (string, 必需): 研究问题
- `search_timeout` (number, 可选): 搜索超时 (默认: 120)
- `research_model` (enum, 可选): 研究模型 (默认: grok-4.20-beta)
- `include_sources` (boolean, 可选): 是否包含来源 (默认: true)

**输出：**
```json
{
  "success": true,
  "search_result": { "output": "...", "lines": 150 },
  "research_result": { "answer": "..." },
  "sources": ["url1", "url2"]
}
```

## 使用场景

| 场景 | 推荐工具 |
|------|----------|
| 需要最新网络信息 | `web_search` |
| 需要 AI 推理分析 | `research` |
| 需要综合网络信息的深度分析 | `deep_search` |

## 调用示例

**研究一个问题：**
```json
{
  "mcp_name": "deep-search",
  "tool_name": "research",
  "arguments": {
    "prompt": "解释量子计算的最新发展",
    "model": "grok-4.20-beta"
  }
}
```

**搜索网络信息：**
```json
{
  "mcp_name": "deep-search",
  "tool_name": "web_search",
  "arguments": {
    "prompt": "最新 AI 代理技术进展",
    "timeout": 60
  }
}
```

**深度搜索（组合）：**
```json
{
  "mcp_name": "deep-search",
  "tool_name": "deep_search",
  "arguments": {
    "prompt": "2024年自动驾驶技术最新进展",
    "search_timeout": 180,
    "research_model": "grok-4.1-expert",
    "include_sources": true
  }
}
```
