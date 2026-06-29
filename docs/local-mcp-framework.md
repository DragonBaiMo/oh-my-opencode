# Local MCP Server Framework

本地 MCP Server 框架允许用户在项目中创建和管理自己的 MCP 服务器，实现跨平台（Windows/macOS）兼容。

## 目录结构

```
. opencode/
    └── mcp-servers/          # 自动创建
          ├── deep-research/   # 内置深度调研 MCP Server
          │     ├── index.ts  # Bun MCP Server 实现
          │     ├── mcp.json # 启动配置
          │     └── SKILL.md # 工具描述
          └── hello-world/     # 示例 MCP Server
                ├── index.ts
                └── mcp.json
```

## 占位符参考

### `{{directory}}`

解析为包含 `mcp.json` 的目录路径。在 Windows 上自动转换反斜杠为正斜杠。

```json
{
  "command": "bun",
  "args": ["run", "{{directory}}/index.ts"]
}
```

### `${PROJECT_ROOT}`

解析为项目根目录（`process.cwd()`）。

```json
{
  "command": "bun",
  "args": ["${PROJECT_ROOT}/scripts/my-script.ts"]
}
```

### `${VAR:-default}`

环境变量展开，支持默认值。

```json
{
  "env": {
    "API_URL": "${API_URL:-http://localhost:3000}"
  }
}
```

## 添加自定义 MCP Server

### 1. 创建目录结构

```bash
. opencode/mcp-servers/
  └── my-tool/
        ├── index.ts    # MCP Server 实现
        └── mcp.json   # 启动配置
```

### 2. 实现 MCP Server

```typescript
// index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({
  name: "my-tool",
  version: "1.0.0"
})

server.registerTool(
  "execute",
  {
    description: "执行自定义工具",
    inputSchema: z.object({
      input: z.string().describe("输入参数")
    })
  },
  async ({ input }) => {
    return { content: [{ type: "text", text: `结果: ${input}` }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
```

### 3. 配置启动参数

```json
// mcp.json
{
  "mcpServers": {
    "my-tool": {
      "command": "bun",
      "args": ["run", "{{directory}}/index.ts"],
      "env": {
        "MY_TOOL_CONFIG": "${MY_TOOL_CONFIG}"
      }
    }
  }
}
```

### 4. 添加 SKILL.md（可选）

```markdown
---
name: my-tool
description: 我的自定义工具
mcp:
  my-tool:
    command: bun
    args:
      - run
      - "{{directory}}/index.ts"
---

# 我的自定义工具

## execute

执行自定义工具。

**参数：**
- `input` (string): 输入参数
```

## 内置 MCP Servers

### deep-research

深度调研工具，通过外部 AI 平台进行技术调研。

**工具：** `research`

```json
{
  "mcp_name": "deep-research",
  "tool_name": "research",
  "arguments": {
    "prompt": "调研问题",
    "model": "grok-4.20-beta"
  }
}
```

**环境变量：**
- `DEEP_RESEARCH_API_URL`: API 地址（默认：`http://45.192.97.104:5432`）
- `DEEP_RESEARCH_API_KEY`: API 密钥（必需）
- `DEEP_RESEARCH_DEFAULT_MODEL`: 默认模型

### hello-world

示例 MCP Server，用于演示 stdio 传输模式。

**工具：** `echo`, `greet`

```json
{
  "mcp_name": "hello-world",
  "tool_name": "echo",
  "arguments": {
    "text": "Hello!",
    "uppercase": true
  }
}
```

## 架构说明

```
用户请求
    ↓
Skill 系统发现 .opencode/mcp-servers/ 目录
    ↓
SkillMcpManager 启动对应的 MCP Server
    ↓
通过 skill_mcp 工具调用 MCP Server
    ↓
结果返回给 Agent
```

## 安装

MCP Server 模板在执行 `bunx oh-my-opencode install` 时自动安装：

```bash
bunx oh-my-opencode install --no-tui --claude=yes
```

这会自动创建 `.opencode/mcp-servers/` 目录并安装内置模板。

## 故障排除

### MCP Server 无法启动

1. 检查 `mcp.json` 格式是否正确
2. 确认 `index.ts` 存在且可执行
3. 运行 `bunx oh-my-opencode doctor` 检查

### 路径问题

- 使用 `{{directory}}` 而非硬编码路径
- Windows 路径会自动转换

### 并发问题

deep-research MCP Server 使用文件锁确保串行执行。
