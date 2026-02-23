# Oh My OpenCode 智能体配置指南

本文档详细说明每个智能体的配置位置和可修改项。

---

## 目录

1. [Sisyphus (主编排器)](#1-sisyphus-主编排器)
2. [Hephaestus (自主深度工作者)](#2-hephaestus-自主深度工作者)
3. [Atlas (任务编排器)](#3-atlas-任务编排器)
4. [Prometheus (规划智能体)](#4-prometheus-规划智能体)
5. [Sisyphus-Junior (任务执行器)](#5-sisyphus-junior-任务执行器)
6. [Oracle (咨询智能体)](#6-oracle-咨询智能体)
7. [Librarian (研究智能体)](#7-librarian-研究智能体)
8. [Explore (代码搜索智能体)](#8-explore-代码搜索智能体)
9. [Metis (预规划分析智能体)](#9-metis-预规划分析智能体)
10. [Momus (计划审查智能体)](#10-momus-计划审查智能体)
11. [Multimodal-Looker (媒体分析智能体)](#11-multimodal-looker-媒体分析智能体)
12. [Browser-Tester (浏览器测试智能体)](#12-browser-tester-浏览器测试智能体)
13. [配置覆盖方法](#配置覆盖方法)

---

## 1. Sisyphus (主编排器)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `claude-opus-4-6` | `src/shared/model-requirements.ts` |
| Variant | `max` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/sisyphus.ts` |
| Max Tokens | `64000` | `src/agents/sisyphus.ts` |
| Thinking | `32000 budget tokens` (Claude) / `reasoningEffort: medium` (GPT) | `src/agents/sisyphus.ts` |

### 默认提示词位置
```
src/agents/sisyphus.ts
├── buildDynamicSisyphusPrompt()     # 主提示词构建函数
├── buildTaskManagementSection()      # 任务管理部分
└── 动态注入部分 (来自 dynamic-agent-prompt-builder.ts):
    ├── buildToolSelectionTable()     # 工具选择表
    ├── buildDelegationTable()        # 委派表
    ├── buildExploreSection()         # Explore 使用指南
    ├── buildLibrarianSection()       # Librarian 使用指南
    ├── buildOracleSection()          # Oracle 使用指南
    └── buildCategorySkillsDelegationGuide()  # Category+Skills 委派指南
```

### 可用工具
**全部工具可用**，除了：
- `call_omo_agent`: deny (通过 task 委派)

### MCP Server
**所有 MCP 均可用** - Sisyphus 可以使用所有已配置的 MCP server。

### 导入其他提示词
✅ **支持** - 通过配置文件的 `prompt_append` 字段追加提示词。

---

## 2. Hephaestus (自主深度工作者)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gpt-5.3-codex` | `src/shared/model-requirements.ts` |
| Variant | `medium` | `src/shared/model-requirements.ts` |
| Temperature | (未指定，使用默认) | `src/agents/hephaestus.ts` |
| Max Tokens | `32000` | `src/agents/hephaestus.ts` |
| Reasoning | `reasoningEffort: medium` | `src/agents/hephaestus.ts` |

### 默认提示词位置
```
src/agents/hephaestus.ts
├── buildHephaestusPrompt()           # 主提示词构建函数
└── 动态注入部分 (来自 dynamic-agent-prompt-builder.ts)
```

### 可用工具
**全部工具可用**，除了：
- `call_omo_agent`: deny

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持** - 通过配置文件的 `prompt_append` 字段。

---

## 3. Atlas (任务编排器)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gemini-3-pro` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/atlas/agent.ts` |

### 默认提示词位置
```
src/agents/atlas/
├── agent.ts                    # Agent 工厂函数
├── default.ts                  # Claude 优化提示词
├── gpt.ts                      # GPT 优化提示词
└── prompt-section-builder.ts   # 动态部分构建
```

### 可用工具
**受限**：
- `task`: deny
- `call_omo_agent`: deny

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 4. Prometheus (规划智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `claude-opus-4-6` | `src/shared/model-requirements.ts` |
| Variant | `max` | `src/shared/model-requirements.ts` |

### 默认提示词位置
```
src/agents/prometheus/
├── index.ts                    # 导出汇总
├── system-prompt.ts            # 主系统提示词组装
├── identity-constraints.ts     # 身份约束 (301 行)
├── interview-mode.ts           # 访谈模式 (335 行)
├── plan-generation.ts          # 计划生成
├── high-accuracy-mode.ts       # 高精度模式
├── plan-template.ts            # 计划模板 (423 行)
└── behavioral-summary.ts       # 行为摘要
```

### 可用工具
**只读** - 规划智能体不执行代码修改。

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持** - 通过 `prompt_append` 字段。

---

## 5. Sisyphus-Junior (任务执行器)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `openai/gpt-5.3-codex` | `src/agents/sisyphus-junior/agent.ts` |

### 默认提示词位置
```
src/agents/sisyphus-junior/
├── agent.ts                    # Agent 工厂函数
├── default.ts                  # Claude 优化提示词
├── gpt.ts                      # GPT 优化提示词
└── index.ts                    # 导出
```

### 可用工具
**受限**：
- `task`: deny (不能委派给其他 agent)
- `call_omo_agent`: **允许** (可以调用 explore/librarian 进行研究)

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 6. Oracle (咨询智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gemini-3-pro` | `src/shared/model-requirements.ts` |
| Variant | `high` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/oracle.ts` |
| Thinking | `32000 budget tokens` (Claude) / `reasoningEffort: medium` (GPT) | `src/agents/oracle.ts` |

### 默认提示词位置
```
src/agents/oracle.ts
└── ORACLE_SYSTEM_PROMPT        # 完整系统提示词 (约 140 行)
```

### 可用工具
**只读**：
- `write`: deny
- `edit`: deny
- `task`: deny
- `call_omo_agent`: deny

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 7. Librarian (研究智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gemini-3-flash` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/librarian.ts` |

### 默认提示词位置
```
src/agents/librarian.ts
└── 内联提示词 (约 300 行)
    ├── PHASE 0: REQUEST CLASSIFICATION
    ├── DEEP RESEARCH TOOL
    ├── PHASE 1: EXECUTE BY REQUEST TYPE
    ├── PHASE 2: EVIDENCE SYNTHESIS
    └── TOOL REFERENCE
```

### 可用工具
**只读**：
- `write`: deny
- `edit`: deny
- `task`: deny
- `call_omo_agent`: deny

### MCP Server
**所有 MCP 均可用** + 特殊访问 `deep-research.mjs` 脚本

### 导入其他提示词
✅ **支持**

---

## 8. Explore (代码搜索智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gemini-3-flash` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/explore.ts` |

### 默认提示词位置
```
src/agents/explore.ts
└── 内联提示词 (约 80 行)
    ├── Intent Analysis
    ├── Parallel Execution
    ├── Structured Results
    └── Tool Strategy
```

### 可用工具
**只读**：
- `write`: deny
- `edit`: deny
- `task`: deny
- `call_omo_agent`: deny

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 9. Metis (预规划分析智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `claude-opus-4-6` | `src/shared/model-requirements.ts` |
| Variant | `max` | `src/shared/model-requirements.ts` |

### 默认提示词位置
```
src/agents/metis.ts
└── METIS_SYSTEM_PROMPT (约 350 行)
    ├── PHASE 0: INTENT CLASSIFICATION
    ├── PHASE 1: INTENT-SPECIFIC ANALYSIS
    │   ├── IF REFACTORING
    │   ├── IF BUILD FROM SCRATCH
    │   ├── IF MID-SIZED TASK
    │   └── ...
    └── OUTPUT FORMAT
```

### 可用工具
**只读**：
- `write`: deny
- `edit`: deny
- `task`: deny

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 10. Momus (计划审查智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gpt-5.3-codex` | `src/shared/model-requirements.ts` |
| Variant | `medium` | `src/shared/model-requirements.ts` |
| Thinking | `32000 budget tokens` (Claude) / `reasoningEffort: medium` (GPT) | `src/agents/momus.ts` |

### 默认提示词位置
```
src/agents/momus.ts
└── MOMUS_SYSTEM_PROMPT (约 240 行)
    ├── Your Purpose
    ├── What You Check
    ├── What You Do NOT Check
    ├── Input Validation
    └── Output Format
```

### 可用工具
**只读**：
- `write`: deny
- `edit`: deny
- `task`: deny

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 11. Multimodal-Looker (媒体分析智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gemini-3-pro` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/multimodal-looker.ts` |

### 默认提示词位置
```
src/agents/multimodal-looker.ts
└── 内联提示词 (约 30 行)
```

### 可用工具
**极度受限** - 只允许：
- `read`: allow (唯一允许的工具)

### MCP Server
**所有 MCP 均可用**

### 导入其他提示词
✅ **支持**

---

## 12. Browser-Tester (浏览器测试智能体)

### 默认模型
| 配置项 | 值 | 配置文件位置 |
|--------|-----|-------------|
| 模型 | `gemini-3-pro` | `src/shared/model-requirements.ts` |
| Temperature | `0.1` | `src/agents/browser-tester.ts` |
| Max Tokens | `32000` | `src/agents/browser-tester.ts` |

### 默认提示词位置
```
src/agents/browser-tester.ts
└── BROWSER_TESTER_SYSTEM_PROMPT (约 180 行)
    ├── Testing Methodology
    │   ├── Phase 1: Test Planning
    │   ├── Phase 2: Functional Testing
    │   ├── Phase 3: Performance Testing
    │   ├── Phase 4: Accessibility Testing
    │   └── Phase 5: Error Handling
    └── Output Format
```

### 可用工具
**全部工具可用** - 需要配合 Chrome DevTools MCP 使用

### MCP Server
**推荐配置**：
```jsonc
// opencode.json
{
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": ["npx", "-y", "chrome-devtools-mcp@latest"],
      "enabled": true
    }
  }
}
```

### 导入其他提示词
✅ **支持**

---

## 配置覆盖方法

### 方法 1: 配置文件覆盖 (推荐)

在 `~/.config/opencode/oh-my-opencode.jsonc` 或项目的 `.opencode/oh-my-opencode.jsonc` 中：

```jsonc
{
  "agents": {
    "sisyphus": {
      // 1. 修改默认模型
      "model": "anthropic/claude-sonnet-4",
      
      // 2. 修改 variant
      "variant": "high",
      
      // 3. 修改温度
      "temperature": 0.2,
      
      // 4. 追加提示词
      "prompt_append": "\n\n## 额外指令\n\n你的自定义提示词...",
      
      // 5. 修改工具权限
      "permission": {
        "bash": "ask"
      },
      
      // 6. 修改 thinking 配置
      "thinking": {
        "type": "enabled",
        "budgetTokens": 64000
      }
    },
    
    "oracle": {
      "model": "openai/gpt-4o",
      "prompt_append": "额外的 Oracle 指令..."
    },
    
    "browser-tester": {
      "model": "google/gemini-2.5-pro"
    }
  }
}
```

### 方法 2: 修改源代码

| 修改项 | 文件位置 |
|--------|----------|
| 默认模型 fallback chain | `src/shared/model-requirements.ts` |
| Agent 提示词 | `src/agents/<agent-name>.ts` |
| 工具权限 | `src/shared/agent-tool-restrictions.ts` |
| 显示名映射 | `src/shared/agent-display-names.ts` |

### 方法 3: 通过 Skill 导入提示词

创建 `.opencode/skills/my-skill/SKILL.md`：

```yaml
---
name: my-custom-skill
description: "自定义技能描述"
agent: "sisyphus"  # 指定使用的 agent
model: "anthropic/claude-opus-4"  # 可选：覆盖模型
mcp:  # 可选：嵌入 MCP 配置
  my-mcp:
    type: http
    url: https://...
---

# 技能提示词内容

这里的内容会在调用 /skill my-custom-skill 时注入到 agent 的上下文中。
```

---

## 工具权限汇总表

| Agent | write | edit | task | call_omo_agent | 其他 |
|-------|-------|------|------|----------------|------|
| Sisyphus | ✅ | ✅ | ✅ | ❌ | 全部可用 |
| Hephaestus | ✅ | ✅ | ✅ | ❌ | 全部可用 |
| Atlas | ✅ | ✅ | ❌ | ❌ | 全部可用 |
| Prometheus | ❌ | ❌ | ❌ | - | 只读 |
| Sisyphus-Junior | ✅ | ✅ | ❌ | ✅ | 全部可用 |
| Oracle | ❌ | ❌ | ❌ | ❌ | 只读 |
| Librarian | ❌ | ❌ | ❌ | ❌ | 只读 |
| Explore | ❌ | ❌ | ❌ | ❌ | 只读 |
| Metis | ❌ | ❌ | ❌ | - | 只读 |
| Momus | ❌ | ❌ | ❌ | - | 只读 |
| Multimodal-Looker | ❌ | ❌ | ❌ | - | 只有 read |
| Browser-Tester | ✅ | ✅ | ✅ | ✅ | 全部可用 |

---

## 模型配置汇总表

| Agent | 默认模型 | Variant | Provider |
|-------|----------|---------|----------|
| Sisyphus | claude-opus-4-6 | max | anthropic |
| Hephaestus | gpt-5.3-codex | medium | openai |
| Atlas | gemini-3-pro | - | google |
| Prometheus | claude-opus-4-6 | max | anthropic |
| Sisyphus-Junior | gpt-5.3-codex | - | openai |
| Oracle | gemini-3-pro | high | google |
| Librarian | gemini-3-flash | - | google |
| Explore | gemini-3-flash | - | google |
| Metis | claude-opus-4-6 | max | anthropic |
| Momus | gpt-5.3-codex | medium | openai |
| Multimodal-Looker | gemini-3-pro | - | google |
| Browser-Tester | gemini-3-pro | - | google |
