import type { BuiltinSkill } from "../types"

export const acceptanceCriteriaSkill: BuiltinSkill = {
  name: "acceptance-criteria",
  description:
    "验收标准技能：使用 INVEST + Given/When/Then，把需求转成可判定、可测试的 AC。",
  template: `# Acceptance Criteria (Scrum + Gherkin)

## 目标

将需求转换为明确、可测试、可验收的标准，避免“看起来差不多”的主观验收。

## 核心规则

### 1) INVEST 自检（每条 AC 都要过）

- Independent（可独立验证）
- Negotiable（可协商，但边界清晰）
- Valuable（对用户/业务有价值）
- Estimable（可估算）
- Small（粒度适中）
- Testable（可测试）

### 2) Gherkin 格式（强制）

每条关键 AC 使用：

Given [前置条件]
When [触发动作]
Then [可观察结果]

## 写法约束

- 禁止模糊词：快、稳定、友好、灵活（除非量化）
- Then 必须可观测/可断言
- 尽量包含正向 + 异常路径
- 一条 AC 只验证一个核心行为

## 输出结构

1. User Story
2. Acceptance Criteria（Gherkin 列表）
3. Negative Cases
4. Definition of Done（简版）

## 输出路径

- \`docs/athena/acceptance/{name}.md\`

若未给定 \`{name}\`，根据目标生成简短 snake_case 名称。`,
}
