import type { OhMyOpenCodeConfig } from "../config";

type AgentWithPermission = { permission?: Record<string, unknown> };

export function applyToolConfig(params: {
  config: Record<string, unknown>;
  pluginConfig: OhMyOpenCodeConfig;
  agentResult: Record<string, unknown>;
}): void {
  const denyTodoTools = params.pluginConfig.experimental?.task_system
    ? { todowrite: "deny", todoread: "deny" }
    : {}

  params.config.tools = {
    ...(params.config.tools as Record<string, unknown>),
    LspHover: false,
    LspCodeActions: false,
    LspCodeActionResolve: false,
    "task_*": false,
    teammate: false,
    webfetch: false,
    WebFetch: false,
    ...(params.pluginConfig.experimental?.task_system
      ? { todowrite: false, todoread: false }
      : {}),
  };

  const isCliRunMode = process.env.OPENCODE_CLI_RUN_MODE === "true";
  const questionPermission = isCliRunMode ? "deny" : "allow";

  if (params.agentResult["multimodal-looker"]) {
    const agent = params.agentResult["multimodal-looker"] as AgentWithPermission;
    agent.permission = { ...agent.permission, task: "deny", look_at: "deny" };
  }
  if (params.agentResult["atlas"]) {
    const agent = params.agentResult["atlas"] as AgentWithPermission;
    agent.permission = {
      ...agent.permission,
      task: "allow",
      call_omo_agent: "deny",
      "task_*": "allow",
      teammate: "allow",
      ...denyTodoTools,
    };
  }
  if (params.agentResult.sisyphus) {
    const agent = params.agentResult.sisyphus as AgentWithPermission;
    agent.permission = {
      ...agent.permission,
      call_omo_agent: "deny",
      task: "allow",
      question: questionPermission,
      "task_*": "allow",
      teammate: "allow",
      ...denyTodoTools,
    };
  }
  if (params.agentResult.hephaestus) {
    const agent = params.agentResult.hephaestus as AgentWithPermission;
    agent.permission = {
      ...agent.permission,
      call_omo_agent: "deny",
      task: "allow",
      question: questionPermission,
      ...denyTodoTools,
    };
  }
  if (params.agentResult["prometheus"]) {
    const agent = params.agentResult["prometheus"] as AgentWithPermission;
    agent.permission = {
      ...agent.permission,
      call_omo_agent: "deny",
      task: "allow",
      question: questionPermission,
      "task_*": "allow",
      teammate: "allow",
      ...denyTodoTools,
    };
  }
  if (params.agentResult["sisyphus-junior"]) {
    const agent = params.agentResult["sisyphus-junior"] as AgentWithPermission;
    agent.permission = {
      ...agent.permission,
      task: "allow",
      "task_*": "allow",
      teammate: "allow",
      ...denyTodoTools,
    };
  }

  params.config.permission = {
    ...(params.config.permission as Record<string, unknown>),
    external_directory: "allow",
    task: "deny",
  };
}
