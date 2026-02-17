import type { BuiltinSkill } from "../types"

export const browserTesterDevtoolsSkill: BuiltinSkill = {
  name: "browser-tester-devtools",
  description:
    "Chrome DevTools MCP for browser-tester agent only. Auto-loaded during browser-tester delegated runs to enable DevTools automation.",
  agent: "browser-tester",
  template: `# Browser Tester DevTools MCP

Chrome DevTools MCP server for browser-tester delegated execution.

This skill is auto-injected for browser-tester task delegations and should not be loaded for other agents.`,
  mcpConfig: {
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
    },
  },
}
