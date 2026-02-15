import type { OhMyOpenCodeConfig } from "../config";
import type { PluginComponents } from "./plugin-components-loader";

export async function applyMcpConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  pluginComponents: PluginComponents;
}): Promise<void> {
  // Built-in MCPs and .mcp.json loading have been removed.
  // MCP servers should be configured via Skill-embedded MCPs (SKILL.md frontmatter)
  // or plugin MCPs.
  params.config.mcp = {
    ...(params.config.mcp as Record<string, unknown>),
    ...params.pluginComponents.mcpServers,
  };
}
