import type { BuiltinSkill } from "../types"

export const requirementsEngineeringSkill: BuiltinSkill = {
  name: "requirements-engineering",
  description:
    "需求工程技能：使用 Wiegers 三层模型 + Cockburn 用例方法，把模糊需求转为可执行规格。",
  template: `# Requirements Engineering

## 目标

将模糊需求转化为可执行、可验证、可追踪的需求规格。

## 方法框架

### 1) Wiegers 三层模型（必须先分层）

- **Business Requirements（Why）**：业务目标与价值
- **User Requirements（What）**：用户在场景中的目标与任务
- **Functional Requirements（How）**：系统行为与约束

规则：
- 每条 Functional 必须能追溯到至少一条 User/Business
- 无父级来源的 Functional 标记为 \`orphan\`

### 2) Cockburn 用例结构（目标导向）

- 主成功场景（Main Success Scenario）
- 扩展场景（Extensions：失败、异常、分支）
- 用例粒度优先保持在用户目标层（Sea-level）

### 3) 需求质量门槛（ISO 29148）

- 原子性：一条需求只描述一个可验证行为
- 无歧义：避免“快/灵活/友好”等不可测词汇
- 可验证：每条需求都能映射到测试
- 可追踪：需求 ID（R-001...）→ 设计/测试映射

## 输出结构（固定）

1. Scope & Goals
2. Requirement Layering（Business/User/Functional）
3. Use Cases（MSS + Extensions）
4. Requirement List（带 R-XXX 编号）
5. Traceability Notes
6. Risks & Assumptions

## 输出路径

- \`docs/athena/requirements/{name}.md\`

若未给定 \`{name}\`，根据目标生成简短 snake_case 名称。`,
}
