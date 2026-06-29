---
name: hello-world
description: Hello World MCP Server - demonstrates stdio MCP server pattern
tools:
  - Bash
mcp:
  hello-world:
    command: bun
    args:
      - run
      - "{{directory}}/index.ts"
---

# Hello World MCP Server

A minimal MCP server demonstrating the stdio transport pattern.

## Available Tools

### echo
Echoes back the input text.

**Input:**
- `text` (string, required): The text to echo back
- `uppercase` (boolean, optional): Whether to return uppercase text

**Example:**
```json
{
  "text": "Hello, World!",
  "uppercase": true
}
```

### greet
Returns a greeting message.

**Input:**
- `name` (string, optional): Name to greet (default: "World")

**Example:**
```json
{
  "name": "Sisyphus"
}
```

## Usage

This MCP server is automatically started by the Skill-MCP system when the `hello-world` skill is loaded.

## Extending

To add your own tools, follow this pattern:

```typescript
server.registerTool(
  "your-tool-name",
  {
    description: "Description of what your tool does",
    inputSchema: z.object({
      param1: z.string().describe("First parameter"),
      param2: z.number().optional().describe("Optional second parameter"),
    }),
  },
  async ({ param1, param2 }) => {
    // Your tool logic here
    return {
      content: [{ type: "text", text: "Result" }]
    }
  }
)
```
