import { describe, it, expect } from "bun:test"
import { AGENT_DISPLAY_NAMES, getAgentDisplayName, getAgentConfigKey } from "./agent-display-names"

describe("getAgentDisplayName", () => {
  it("returns display name for lowercase config key (new format)", () => {
    // given config key "sisyphus"
    const configKey = "sisyphus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns Chinese display name used by current fork
    expect(result).toBe("Sisyphus (主编排器，负责任务协调和委派)")
  })

  it("returns display name for uppercase config key (old format - case-insensitive)", () => {
    // given config key "Sisyphus" (old format)
    const configKey = "Sisyphus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns Chinese display name (case-insensitive lookup)
    expect(result).toBe("Sisyphus (主编排器，负责任务协调和委派)")
  })

  it("returns original key for unknown agents (fallback)", () => {
    // given config key "custom-agent"
    const configKey = "custom-agent"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "custom-agent" (original key unchanged)
    expect(result).toBe("custom-agent")
  })

  it("returns display name for atlas", () => {
    // given config key "atlas"
    const configKey = "atlas"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

     // then returns current Atlas display name
    expect(result).toBe("Atlas (主编排器，通过task()完成todo列表中的所有任务)")
  })

  it("returns display name for prometheus", () => {
    // given config key "prometheus"
    const configKey = "prometheus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Prometheus display name
    expect(result).toBe("Prometheus (规划智能体，负责生成工作计划)")
  })

  it("returns display name for sisyphus-junior", () => {
    // given config key "sisyphus-junior"
    const configKey = "sisyphus-junior"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Sisyphus-Junior display name
    expect(result).toBe("Sisyphus-Junior (聚焦任务执行器，执行委派任务)")
  })

  it("returns display name for metis", () => {
    // given config key "metis"
    const configKey = "metis"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Metis display name
    expect(result).toBe("Metis (预规划分析智能体，在规划前分析用户请求)")
  })

  it("returns display name for momus", () => {
    // given config key "momus"
    const configKey = "momus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

     // then returns current Momus display name
    expect(result).toBe("Momus (计划审查智能体，验证计划可执行性)")
  })

  it("returns display name for oracle", () => {
    // given config key "oracle"
    const configKey = "oracle"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Oracle display name
    expect(result).toBe("Oracle (只读咨询智能体，高智商推理专家)")
  })

  it("returns display name for librarian", () => {
    // given config key "librarian"
    const configKey = "librarian"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Librarian display name
    expect(result).toBe("Librarian (多仓库研究智能体，搜索远程代码库和文档)")
  })

  it("returns display name for explore", () => {
    // given config key "explore"
    const configKey = "explore"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Explore display name
    expect(result).toBe("Explore (快速代码库搜索智能体)")
  })

  it("returns display name for multimodal-looker", () => {
    // given config key "multimodal-looker"
    const configKey = "multimodal-looker"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns current Multimodal-Looker display name
    expect(result).toBe("Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)")
  })

  it("returns display name for browser-tester", () => {
    // given config key "browser-tester"
    const configKey = "browser-tester"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns Browser-Tester display name
    expect(result).toBe("Browser-Tester (浏览器回归测试智能体，Chrome DevTools集成)")
  })

  it("returns display name for athena", () => {
    // given config key "athena"
    const configKey = "athena"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns Athena display name
    expect(result).toBe("Athena (业务分析智能体，需求梳理与验收定义)")
  })

  it("normalizes legacy display-like name by prefix", () => {
    // given a legacy display-like name not present in reverse map
    const configKey = "Hephaestus (Deep Agent)"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then resolves by known prefix
    expect(result).toBe("Hephaestus (自主深度工作者，目标导向的端到端任务执行)")
  })
})

describe("getAgentConfigKey", () => {
  it("resolves display name to config key", () => {
    // given current display name
    // when getAgentConfigKey called
    // then returns "sisyphus"
    expect(getAgentConfigKey("Sisyphus (主编排器，负责任务协调和委派)")).toBe("sisyphus")
  })

  it("resolves display name case-insensitively", () => {
    // given display name in different case
    // when getAgentConfigKey called
    // then returns "atlas"
    expect(getAgentConfigKey("atlas (主编排器，通过task()完成todo列表中的所有任务)")).toBe("atlas")
  })

  it("passes through lowercase config keys unchanged", () => {
    // given lowercase config key "prometheus"
    // when getAgentConfigKey called
    // then returns "prometheus"
    expect(getAgentConfigKey("prometheus")).toBe("prometheus")
  })

  it("returns lowercased unknown agents", () => {
    // given unknown agent name
    // when getAgentConfigKey called
    // then returns lowercased
    expect(getAgentConfigKey("Custom-Agent")).toBe("custom-agent")
  })

  it("resolves all core agent display names", () => {
    // given all core display names
    // when/then each resolves to its config key
    expect(getAgentConfigKey("Hephaestus (自主深度工作者，目标导向的端到端任务执行)")).toBe("hephaestus")
    expect(getAgentConfigKey("Prometheus (规划智能体，负责生成工作计划)")).toBe("prometheus")
    expect(getAgentConfigKey("Atlas (主编排器，通过task()完成todo列表中的所有任务)")).toBe("atlas")
    expect(getAgentConfigKey("Metis (预规划分析智能体，在规划前分析用户请求)")).toBe("metis")
    expect(getAgentConfigKey("Momus (计划审查智能体，验证计划可执行性)")).toBe("momus")
    expect(getAgentConfigKey("Sisyphus-Junior (聚焦任务执行器，执行委派任务)")).toBe("sisyphus-junior")
    expect(getAgentConfigKey("Athena (业务分析智能体，需求梳理与验收定义)")).toBe("athena")
    expect(getAgentConfigKey("Browser-Tester (浏览器回归测试智能体，Chrome DevTools集成)")).toBe("browser-tester")
  })

  it("resolves legacy display-like names by prefix", () => {
    // given / when / then
    expect(getAgentConfigKey("Hephaestus (Deep Agent)")).toBe("hephaestus")
    expect(getAgentConfigKey("Sisyphus (Ultraworker)")).toBe("sisyphus")
  })
})

describe("AGENT_DISPLAY_NAMES", () => {
  it("contains all expected agent mappings", () => {
    // given expected mappings
    const expectedMappings = {
      sisyphus: "Sisyphus (主编排器，负责任务协调和委派)",
      hephaestus: "Hephaestus (自主深度工作者，目标导向的端到端任务执行)",
      prometheus: "Prometheus (规划智能体，负责生成工作计划)",
      atlas: "Atlas (主编排器，通过task()完成todo列表中的所有任务)",
      "sisyphus-junior": "Sisyphus-Junior (聚焦任务执行器，执行委派任务)",
      metis: "Metis (预规划分析智能体，在规划前分析用户请求)",
      momus: "Momus (计划审查智能体，验证计划可执行性)",
      oracle: "Oracle (只读咨询智能体，高智商推理专家)",
      librarian: "Librarian (多仓库研究智能体，搜索远程代码库和文档)",
      explore: "Explore (快速代码库搜索智能体)",
      athena: "Athena (业务分析智能体，需求梳理与验收定义)",
      "browser-tester": "Browser-Tester (浏览器回归测试智能体，Chrome DevTools集成)",
      "multimodal-looker": "Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)",
    }

    // when checking the constant
    // then contains all expected mappings
    expect(AGENT_DISPLAY_NAMES).toEqual(expectedMappings)
  })
})
