## 2026-03-19 upstream sync: merge upstream/dev into local dev

- **魔改类型**: Override
- **需求来源**: 上游同步批次 `upstream/dev (c3b23bf6..e85fe6f1)`
- **改动范围**: 整仓上游同步（merge commit `e85fe6f1`）；冲突语义合并点为 `src/hooks/atlas/atlas-hook.ts`、`src/hooks/atlas/tool-execute-before.ts`、`src/plugin/event.ts`、`src/tools/delegate-task/tools.ts`，并在 `src/plugin-handlers/tool-config-handler.ts` 做本地护栏回灌
- **决策与理由**: 以 `upstream/dev` 为同步基线吸收上游修复与功能更新，同时维持本地 fork 安全边界：不回流 browser automation 链路，不恢复远程 MCP 能力放权，保留默认 deny + fail-closed 策略
- **验收结果**: 契约✓ 回归✓ 冒烟✓
- **证据**:
  - 回归测试: `bun test src/tools/delegate-task/browser-tester-skill-injection.test.ts src/features/builtin-skills/skills.test.ts src/mcp/index.test.ts src/config/schema.test.ts` (70 pass)
  - 类型检查: `bun run typecheck` (pass)
  - 构建: `bun run build` (pass)
  - 护栏审计: `src/plugin-handlers/tool-config-handler.ts`（移除 librarian 对 `websearch/context7_*/grep_app_*` 的 allow）；`src/features/builtin-skills/agent-browser/SKILL.md` 删除
- **回滚**: `git revert -m 1 e85fe6f1` 撤销本次 merge

## 2026-03-16 upstream sync: merge upstream/dev into local dev

- **魔改类型**: Override
- **需求来源**: 上游同步批次 `upstream/dev (a5e1dffc..4759dfb6)`
- **改动范围**: 整仓上游同步（merge commit `a9bea3b0`）；冲突语义合并点为 `src/features/background-agent/manager.test.ts`、`src/features/background-agent/manager.ts`、`src/features/claude-code-agent-loader/loader.ts`、`src/hooks/runtime-fallback/auto-retry.ts`、`src/hooks/runtime-fallback/error-classifier.test.ts`、`src/hooks/runtime-fallback/hook.ts`、`src/plugin-handlers/agent-config-handler.ts`、`src/plugin/hooks/create-session-hooks.ts`，并补充对 `src/plugin/event.ts`、`src/plugin/skill-context.ts` 的类型兼容修复
- **决策与理由**: 以 `upstream/dev` 为同步基线吸收上游修复，同时保持本地 fork 护栏（外部研究工具默认 deny，仅 librarian 放行；内置 MCP 维持禁用导出；浏览器验证路径维持 browser-tester）
- **验收结果**: 契约✓ 回归✓ 冒烟✓
- **证据**:
  - 关键字审计: `git grep -n -E "playwright|playwright-cli|agent-browser|dev-browser|browser_automation_engine|context7|grep_app|websearch" -- src assets`
  - 回归测试: `bun test src/tools/delegate-task/browser-tester-skill-injection.test.ts src/features/builtin-skills/skills.test.ts src/mcp/index.test.ts src/config/schema.test.ts` (70 pass)
  - 类型检查: `bun run typecheck` (pass)
  - 构建: `bun run build` (pass)
  - 权限审计: `src/plugin-handlers/tool-config-handler.ts`（默认 deny，librarian 例外 allow）
- **回滚**: `git revert -m 1 a9bea3b0` 撤销本次 merge；同步前本地未提交改动可通过 `git stash apply stash@{0}` 恢复

## 2026-03-09 upstream sync: merge upstream/dev into local dev

- **魔改类型**: Override
- **需求来源**: 上游同步批次 `upstream/dev (a7f794c7..2e8f0835)`
- **改动范围**: 整仓上游同步（merge commit `923239d7`）；冲突语义合并点为 `bun.lock`、`package.json`、`src/agents/hephaestus/gpt-5-3-codex.ts`、`src/agents/librarian.ts`、`src/agents/types.ts`、`src/features/AGENTS.md`、`src/features/claude-code-agent-loader/loader.ts`、`src/features/claude-code-agent-loader/types.ts`、`src/hooks/no-sisyphus-gpt/hook.ts`、`src/hooks/no-sisyphus-gpt/index.test.ts`、`src/plugin/system-transform.ts`、`src/shared/model-requirements.ts`
- **决策与理由**: 以 `upstream/dev` 为同步基线吸收上游修复与结构更新，同时保留本地 fork 护栏语义（工具默认禁外部研究，仅 librarian 显式放行；保持内置 MCP 移除策略；浏览器验证路径维持 browser-tester）
- **验收结果**: 契约✓ 回归✓ 冒烟✓
- **证据**:
  - 关键字审计（环境无 `rg`，改用 `git grep`）：`git grep -n -E "playwright|playwright-cli|agent-browser|dev-browser|browser_automation_engine|context7|grep_app|websearch" -- src assets`
  - 回归测试: `bun test src/tools/delegate-task/browser-tester-skill-injection.test.ts src/features/builtin-skills/skills.test.ts src/mcp/index.test.ts src/config/schema.test.ts` (67 pass)
  - 类型检查: `bun run typecheck` (pass)
  - 构建: `bun run build` (pass)
  - 护栏审计: `src/plugin-handlers/tool-config-handler.ts`, `src/mcp/index.ts`, `src/hooks/no-sisyphus-gpt/hook.ts`
- **回滚**: `git revert -m 1 923239d7` 撤销本次 merge；同步前本地未提交改动可通过 `git stash apply stash@{0}` 恢复

## 2026-03-03 upstream sync: merge upstream/dev into local dev

- **魔改类型**: Override
- **需求来源**: 上游同步批次 `upstream/dev (91d405c0..ceb8b239)`
- **改动范围**: 整仓上游同步；冲突语义合并点为 `bun.lock`、`src/config/schema/oh-my-opencode-config.ts`、`src/plugin-handlers/tool-config-handler.ts`、`src/tools/delegate-task/subagent-resolver.test.ts`
- **决策与理由**: 以 `upstream/dev` 为同步基线吸收上游修复，同时保留本地 fork 护栏语义（默认禁用外部研究工具，仅 librarian 放行；保持本地 MCP 移除策略）
- **验收结果**: 契约✓ 回归✓ 冒烟✓
- **证据**:
  - 回归测试: `bun test src/tools/delegate-task/browser-tester-skill-injection.test.ts src/features/builtin-skills/skills.test.ts src/mcp/index.test.ts src/config/schema.test.ts` (67 pass)
  - 类型检查: `bun run typecheck` (pass)
  - 构建: `bun run build` (pass)
  - 护栏审计: `src/plugin-handlers/tool-config-handler.ts`, `src/mcp/index.ts`
- **回滚**: `git revert -m 1 654acad0` 撤销本次 merge；若需保留同步前本地未提交改动，使用 `git stash list` 中 `pre-upstream-sync-20260303` 进行恢复
