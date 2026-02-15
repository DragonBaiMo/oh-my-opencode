import { describe, it, expect } from "bun:test"
import { AGENT_DISPLAY_NAMES, getAgentDisplayName } from "./agent-display-names"

describe("getAgentDisplayName", () => {
  it("returns display name for lowercase config key (new format)", () => {
    // given config key "sisyphus"
    const configKey = "sisyphus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Sisyphus (主编排器，负责任务协调和委派)"
    expect(result).toBe("Sisyphus (主编排器，负责任务协调和委派)")
  })

  it("returns display name for uppercase config key (old format - case-insensitive)", () => {
    // given config key "Sisyphus" (old format)
    const configKey = "Sisyphus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Sisyphus (主编排器，负责任务协调和委派)" (case-insensitive lookup)
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

    // then returns "Atlas (主编排器，通过task()完成todo列表中的所有任务)"
    expect(result).toBe("Atlas (主编排器，通过task()完成todo列表中的所有任务)")
  })

  it("returns display name for prometheus", () => {
    // given config key "prometheus"
    const configKey = "prometheus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Prometheus (规划智能体，负责生成工作计划)"
    expect(result).toBe("Prometheus (规划智能体，负责生成工作计划)")
  })

  it("returns display name for sisyphus-junior", () => {
    // given config key "sisyphus-junior"
    const configKey = "sisyphus-junior"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Sisyphus-Junior (聚焦任务执行器，执行委派任务)"
    expect(result).toBe("Sisyphus-Junior (聚焦任务执行器，执行委派任务)")
  })

  it("returns display name for metis", () => {
    // given config key "metis"
    const configKey = "metis"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Metis (预规划分析智能体，在规划前分析用户请求)"
    expect(result).toBe("Metis (预规划分析智能体，在规划前分析用户请求)")
  })

  it("returns display name for momus", () => {
    // given config key "momus"
    const configKey = "momus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Momus (计划审查智能体，验证计划可执行性)"
    expect(result).toBe("Momus (计划审查智能体，验证计划可执行性)")
  })

  it("returns display name for oracle", () => {
    // given config key "oracle"
    const configKey = "oracle"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Oracle (只读咨询智能体，高智商推理专家)"
    expect(result).toBe("Oracle (只读咨询智能体，高智商推理专家)")
  })

  it("returns display name for librarian", () => {
    // given config key "librarian"
    const configKey = "librarian"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Librarian (多仓库研究智能体，搜索远程代码库和文档)"
    expect(result).toBe("Librarian (多仓库研究智能体，搜索远程代码库和文档)")
  })

  it("returns display name for explore", () => {
    // given config key "explore"
    const configKey = "explore"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Explore (快速代码库搜索智能体)"
    expect(result).toBe("Explore (快速代码库搜索智能体)")
  })

  it("returns display name for multimodal-looker", () => {
    // given config key "multimodal-looker"
    const configKey = "multimodal-looker"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)"
    expect(result).toBe("Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)")
  })

  it("returns display name for hephaestus", () => {
    // given config key "hephaestus"
    const configKey = "hephaestus"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Hephaestus (自主深度工作者，目标导向的端到端任务执行)"
    expect(result).toBe("Hephaestus (自主深度工作者，目标导向的端到端任务执行)")
  })
})

describe("AGENT_DISPLAY_NAMES", () => {
  it("contains all expected agent mappings", () => {
    // given expected mappings
    const expectedMappings = {
      sisyphus: "Sisyphus (主编排器，负责任务协调和委派)",
      hephaestus: "Hephaestus (自主深度工作者，目标导向的端到端任务执行)",
      atlas: "Atlas (主编排器，通过task()完成todo列表中的所有任务)",
      prometheus: "Prometheus (规划智能体，负责生成工作计划)",
      "sisyphus-junior": "Sisyphus-Junior (聚焦任务执行器，执行委派任务)",
      metis: "Metis (预规划分析智能体，在规划前分析用户请求)",
      momus: "Momus (计划审查智能体，验证计划可执行性)",
      oracle: "Oracle (只读咨询智能体，高智商推理专家)",
      librarian: "Librarian (多仓库研究智能体，搜索远程代码库和文档)",
      explore: "Explore (快速代码库搜索智能体)",
      "multimodal-looker": "Multimodal-Looker (媒体分析智能体，解析PDF、图片和图表)",
    }

    // when checking the constant
    // then contains all expected mappings
    expect(AGENT_DISPLAY_NAMES).toEqual(expectedMappings)
  })
})