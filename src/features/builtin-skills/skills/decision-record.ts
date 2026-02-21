import type { BuiltinSkill } from "../types"

export const decisionRecordSkill: BuiltinSkill = {
  name: "decision-record",
  description:
    "架构决策记录技能：基于 MADR 模板记录 Context/Decision/Consequences，形成可追溯决策文档。",
  template: `# Decision Record (ADR / MADR)

## 目标

记录关键技术/业务决策，确保后续可追溯“为什么这么做”。

## 模板（MADR 精简版）

### Title
- ADR-{N}-{short-title}

### Status
- Proposed | Accepted | Deprecated | Superseded

### Context
- 当前问题背景
- 约束条件
- 不做决策的风险

### Decision
- 选择了什么
- 边界与适用范围

### Consequences
- 正向影响
- 负向影响/代价
- 后续行动

## 书写规则

- 只记录“关键决策”，不是实现细节流水账
- 决策必须与目标/约束直接关联
- Consequences 不能只写优点，必须写代价

## 输出路径

- \`docs/athena/adr/ADR-{N}-{title}.md\`

若未给定编号，使用当前目录内最大 ADR 编号 + 1。`,
}
