import type { BuiltinSkill } from "../types"

export const contractDeliverySkill: BuiltinSkill = {
  name: "contract-delivery",
  description:
    "合同交付技能：输出 SOW/RTM/RACI 结构，形成可验收、可追踪、可交付的文档包。",
  template: `# Contract Delivery (SOW / RTM / RACI)

## 目标

将需求转化为“可签收”的交付文档结构，避免范围扯皮与验收争议。

## 交付包结构

### 1) SOW（Statement of Work）

最小章节：
- 项目背景与目标
- 交付范围（In/Out）
- 交付物清单（Deliverables）
- 验收标准（可测试）
- 里程碑与排期
- 变更流程（Change Control）

### 2) RTM（Requirements Traceability Matrix）

建议字段：
- Requirement ID（R-XXX）
- Requirement Description
- Design/Module Reference
- Test Case Reference
- Acceptance Link
- Status

### 3) RACI（责任矩阵）

建议字段：
- 活动/交付项
- Responsible
- Accountable
- Consulted
- Informed

## 输出规则

- 所有验收标准必须可验证（建议 Given/When/Then）
- 所有交付项必须对应责任归属（RACI）
- 所有需求必须可追踪（RTM）

## 输出路径

- \`docs/athena/contract/{name}-sow.md\`

若未给定 \`{name}\`，根据目标生成简短 snake_case 名称。`,
}
