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
