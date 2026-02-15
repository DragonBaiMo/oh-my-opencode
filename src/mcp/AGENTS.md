# MCP KNOWLEDGE BASE

## OVERVIEW

MCP type definitions and utilities. Built-in remote MCPs have been removed.

**MCP System**:
- **Skill-embedded** (`features/opencode-skill-loader/`): YAML frontmatter in SKILL.md
- **Plugin MCPs** (`features/claude-code-plugin-loader/`): Plugin-provided MCP servers

## STRUCTURE
```
mcp/
├── index.ts        # createBuiltinMcps() - returns empty (no built-in MCPs)
└── types.ts        # McpNameSchema, AnyMcpNameSchema
```

## NOTES

- Built-in MCPs (websearch, context7, grep_app) have been removed
- .mcp.json loading has been disabled
- MCP servers should be configured via Skill-embedded MCPs (SKILL.md frontmatter)
