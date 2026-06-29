---
name: deep-research
description: Local Deep Research MCP Server - execute research queries via external AI
agent: librarian
tools:
  - Bash
mcp:
  deep-research:
    command: bun
    args:
      - run
      - "{{directory}}/index.ts"
    env:
      DEEP_RESEARCH_API_URL: "${DEEP_RESEARCH_API_URL:-http://45.192.97.104:5432}"
      DEEP_RESEARCH_API_KEY: "${DEEP_RESEARCH_API_KEY}"
      DEEP_RESEARCH_DEFAULT_MODEL: "${DEEP_RESEARCH_DEFAULT_MODEL:-grok-4.20-beta}"
---

# Deep Research MCP Server

Local MCP server for executing deep research queries using external AI models (grok).

## Features

- **Serial Execution**: Main thread lock ensures only one research request runs at a time
- **Model Fallback**: Automatically falls back from `grok-4.1-expert` to `grok-4.20-beta` on 403 errors
- **OpenAI-compatible API**: Works with any OpenAI-compatible endpoint

## Available Tools

### research

Executes a deep research query.

**Input:**
- `prompt` (string, required): The research query or question to investigate
- `model` (enum, optional): Model to use - `grok-4.20-beta` (default) or `grok-4.1-expert`

**Output:**
```json
{
  "success": true,
  "selected_model": "grok-4.20-beta",
  "actual_model": "grok-4.20-beta",
  "research_prompt": "Explain quantum computing...",
  "answer": "Quantum computing is...",
  "usage": { "prompt_tokens": 100, "completion_tokens": 500 },
  "fallback_from": "grok-4.1-expert"  // Only present if fallback occurred
}
```

**Example:**
```json
{
  "prompt": "What are the latest developments in AI agents?",
  "model": "grok-4.20-beta"
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEP_RESEARCH_API_URL` | No | `http://45.192.97.104:5432` | API endpoint URL |
| `DEEP_RESEARCH_API_KEY` | Yes | - | API authentication key |
| `DEEP_RESEARCH_DEFAULT_MODEL` | No | `grok-4.20-beta` | Default model |
| `DEEP_RESEARCH_LOCK_FILE` | No | System temp | Lock file path |

## Usage

This MCP server is automatically started by the Skill-MCP system when the `deep-research` skill is loaded by the Librarian agent.

### Direct Testing

```bash
# List available tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun run index.ts

# Execute a research query
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"research","arguments":{"prompt":"Hello world","model":"grok-4.20-beta"}}}' | bun run index.ts
```

## Architecture

```
User Request → Librarian Agent → skill_mcp tool → SkillMcpManager → deep-research MCP Server
                                                                         ↓
                                                              executeResearch()
                                                                         ↓
                                                              API Response
```

## Limitations

- Multi-turn conversation is disabled
- Only supports single-shot research queries
- Requires `DEEP_RESEARCH_API_KEY` to be set
