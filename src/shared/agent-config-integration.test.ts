import { describe, test, expect } from "bun:test"
import { migrateAgentNames } from "./migration"
import { getAgentDisplayName } from "./agent-display-names"
import { AGENT_MODEL_REQUIREMENTS } from "./model-requirements"

describe("Agent Config Integration", () => {
  describe("Old format config migration", () => {
    test("migrates old format agent keys to lowercase", () => {
      // given - config with old format keys
      const oldConfig = {
        Sisyphus: { model: "anthropic/claude-opus-4-6" },
        Atlas: { model: "anthropic/claude-opus-4-6" },
        "Prometheus (Planner)": { model: "anthropic/claude-opus-4-6" },
        "Metis (Plan Consultant)": { model: "anthropic/claude-sonnet-4-5" },
        "Momus (Plan Reviewer)": { model: "anthropic/claude-sonnet-4-5" },
      }

      // when - migration is applied
      const result = migrateAgentNames(oldConfig)

      // then - keys are lowercase
      expect(result.migrated).toHaveProperty("sisyphus")
      expect(result.migrated).toHaveProperty("atlas")
      expect(result.migrated).toHaveProperty("prometheus")
      expect(result.migrated).toHaveProperty("metis")
      expect(result.migrated).toHaveProperty("momus")

      // then - old keys are removed
      expect(result.migrated).not.toHaveProperty("Sisyphus")
      expect(result.migrated).not.toHaveProperty("Atlas")
      expect(result.migrated).not.toHaveProperty("Prometheus (Planner)")
      expect(result.migrated).not.toHaveProperty("Metis (Plan Consultant)")
      expect(result.migrated).not.toHaveProperty("Momus (Plan Reviewer)")

      // then - values are preserved
      expect(result.migrated.sisyphus).toEqual({ model: "anthropic/claude-opus-4-6" })
      expect(result.migrated.atlas).toEqual({ model: "anthropic/claude-opus-4-6" })
      expect(result.migrated.prometheus).toEqual({ model: "anthropic/claude-opus-4-6" })
      
      // then - changed flag is true
      expect(result.changed).toBe(true)
    })

    test("preserves already lowercase keys", () => {
      // given - config with lowercase keys
      const config = {
        sisyphus: { model: "anthropic/claude-opus-4-6" },
        oracle: { model: "openai/gpt-5.2" },
        librarian: { model: "opencode/glm-4.7-free" },
      }

      // when - migration is applied
      const result = migrateAgentNames(config)

      // then - keys remain unchanged
      expect(result.migrated).toEqual(config)
      
      // then - changed flag is false
      expect(result.changed).toBe(false)
    })

    test("handles mixed case config", () => {
      // given - config with mixed old and new format
      const mixedConfig = {
        Sisyphus: { model: "anthropic/claude-opus-4-6" },
        oracle: { model: "openai/gpt-5.2" },
        "Prometheus (Planner)": { model: "anthropic/claude-opus-4-6" },
        librarian: { model: "opencode/glm-4.7-free" },
      }

      // when - migration is applied
      const result = migrateAgentNames(mixedConfig)

      // then - all keys are lowercase
      expect(result.migrated).toHaveProperty("sisyphus")
      expect(result.migrated).toHaveProperty("oracle")
      expect(result.migrated).toHaveProperty("prometheus")
      expect(result.migrated).toHaveProperty("librarian")
      expect(Object.keys(result.migrated).every((key) => key === key.toLowerCase())).toBe(true)
      
      // then - changed flag is true
      expect(result.changed).toBe(true)
    })
  })

  describe("Display name resolution", () => {
    test("returns correct display names for all builtin agents", () => {
      // given - lowercase config keys
      const agents = ["sisyphus", "atlas", "prometheus", "metis", "momus", "oracle", "librarian", "explore", "multimodal-looker"]

      // when - display names are requested
      const displayNames = agents.map((agent) => getAgentDisplayName(agent))

      // then - display names are correct
      expect(displayNames).toContain("Sisyphus (主编排器，负责任务协调和委派)")
      expect(displayNames).toContain("Atlas (主编排器，通过task()完成todo列表中的所有任务)")
      expect(displayNames).toContain("Prometheus (规划智能体，负责生成工作计划)")
      expect(displayNames).toContain("Metis (预规划分析智能体，在规划前分析用户请求)")
      expect(displayNames).toContain("Momus (计划审查智能体，验证计划可执行性)")
      expect(displayNames).toContain("Oracle (只读咨询智能体，高智商推理专家)")
      expect(displayNames).toContain("Librarian (多仓库研究智能体，搜索远程代码库和文档)")
      expect(displayNames).toContain("Explore (快速代码库搜索智能体)")
      expect(displayNames).toContain("Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)")
    })

    test("handles lowercase keys case-insensitively", () => {
      // given - various case formats of lowercase keys
      const keys = ["Sisyphus", "Atlas", "SISYPHUS", "atlas", "prometheus", "PROMETHEUS"]

      // when - display names are requested
      const displayNames = keys.map((key) => getAgentDisplayName(key))

      // then - correct display names are returned
      expect(displayNames[0]).toBe("Sisyphus (主编排器，负责任务协调和委派)")
      expect(displayNames[1]).toBe("Atlas (主编排器，通过task()完成todo列表中的所有任务)")
      expect(displayNames[2]).toBe("Sisyphus (主编排器，负责任务协调和委派)")
      expect(displayNames[3]).toBe("Atlas (主编排器，通过task()完成todo列表中的所有任务)")
      expect(displayNames[4]).toBe("Prometheus (规划智能体，负责生成工作计划)")
      expect(displayNames[5]).toBe("Prometheus (规划智能体，负责生成工作计划)")
    })

    test("returns original key for unknown agents", () => {
      // given - unknown agent key
      const unknownKey = "custom-agent"

      // when - display name is requested
      const displayName = getAgentDisplayName(unknownKey)

      // then - original key is returned
      expect(displayName).toBe(unknownKey)
    })
  })

  describe("Model requirements integration", () => {
    test("all model requirements use lowercase keys", () => {
      // given - AGENT_MODEL_REQUIREMENTS object
      const agentKeys = Object.keys(AGENT_MODEL_REQUIREMENTS)

      // when - checking key format
      const allLowercase = agentKeys.every((key) => key === key.toLowerCase())

      // then - all keys are lowercase
      expect(allLowercase).toBe(true)
    })

    test("model requirements include all builtin agents", () => {
      // given - expected builtin agents
      const expectedAgents = ["sisyphus", "atlas", "prometheus", "metis", "momus", "oracle", "librarian", "explore", "multimodal-looker"]

      // when - checking AGENT_MODEL_REQUIREMENTS
      const agentKeys = Object.keys(AGENT_MODEL_REQUIREMENTS)

      // then - all expected agents are present
      for (const agent of expectedAgents) {
        expect(agentKeys).toContain(agent)
      }
    })

    test("no uppercase keys in model requirements", () => {
      // given - AGENT_MODEL_REQUIREMENTS object
      const agentKeys = Object.keys(AGENT_MODEL_REQUIREMENTS)

      // when - checking for uppercase keys
      const uppercaseKeys = agentKeys.filter((key) => key !== key.toLowerCase())

      // then - no uppercase keys exist
      expect(uppercaseKeys).toEqual([])
    })
  })

  describe("End-to-end config flow", () => {
    test("old config migrates and displays correctly", () => {
      // given - old format config
      const oldConfig = {
        Sisyphus: { model: "anthropic/claude-opus-4-6", temperature: 0.1 },
        "Prometheus (Planner)": { model: "anthropic/claude-opus-4-6" },
      }

      // when - config is migrated
      const result = migrateAgentNames(oldConfig)

      // then - keys are lowercase
      expect(result.migrated).toHaveProperty("sisyphus")
      expect(result.migrated).toHaveProperty("prometheus")

      // when - display names are retrieved
      const sisyphusDisplay = getAgentDisplayName("sisyphus")
      const prometheusDisplay = getAgentDisplayName("prometheus")

      // then - display names are correct
      expect(sisyphusDisplay).toBe("Sisyphus (Ultraworker)")
      expect(prometheusDisplay).toBe("Prometheus (Plan Builder)")

      // then - config values are preserved
      expect(result.migrated.sisyphus).toEqual({ model: "anthropic/claude-opus-4-6", temperature: 0.1 })
      expect(result.migrated.prometheus).toEqual({ model: "anthropic/claude-opus-4-6" })
    })

    test("new config works without migration", () => {
      // given - new format config (already lowercase)
      const newConfig = {
        sisyphus: { model: "anthropic/claude-opus-4-6" },
        atlas: { model: "anthropic/claude-opus-4-6" },
      }

      // when - migration is applied (should be no-op)
      const result = migrateAgentNames(newConfig)

      // then - config is unchanged
      expect(result.migrated).toEqual(newConfig)
      
      // then - changed flag is false
      expect(result.changed).toBe(false)

      // when - display names are retrieved
      const sisyphusDisplay = getAgentDisplayName("sisyphus")
      const atlasDisplay = getAgentDisplayName("atlas")

      // then - display names are correct
      expect(sisyphusDisplay).toBe("Sisyphus (Ultraworker)")
      expect(atlasDisplay).toBe("Atlas (Plan Execution Orchestrator)")
    })
  })
})
