---
name: codex-deep-search
description: 使用 Codex CLI 进行深度网络搜索，适用于需要多来源综合的复杂查询。当 Brave API 搜索结果不够充分、用户要求深入研究、全面分析，或使用"deep search"、"详细搜索"、"帮我查一下"等关键词，以及需要追踪多个链接和交叉引用来源时使用。
---

# Codex 深度搜索

使用 Codex CLI 的网络搜索能力进行比 Brave API 摘要更深入的研究任务。

## 何时优先使用此工具而非 web_search

- 需要多来源综合的复杂/小众主题
- 用户明确要求深入/全面的研究
- Brave 搜索结果过于浅显或缺少上下文

## 使用方法

### 主线程模式（默认，推荐）

```powershell
# 前台同步执行: 调研完成后再返回
node "D:\CustomBuild\Project\oh-my-opencode\codex-deep-search\scripts\search.js" `
    --prompt "你的研究查询" `
    --task-name "notebooklm-research" `
    --timeout 120
```

脚本结束时会输出 `RESULT_JSON`，可被上层系统直接解析。

### 调度模式（可选 — 后台执行 + 回调）

```powershell
# 后台运行（Windows PowerShell）
$job = Start-Job -ScriptBlock {
    node "D:\CustomBuild\Project\oh-my-opencode\codex-deep-search\scripts\search.js" `
        --mode "dispatch" `
        --prompt "你的研究查询" `
        --task-name "notebooklm-research" `
        --telegram-group "-5006066016" `
        --timeout 120
}
```

```bash
# 后台运行（Linux/macOS/WSL）
nohup node /path/to/search.js \
  --mode "dispatch" \
  --prompt "你的研究查询" \
  --task-name "notebooklm-research" \
  --telegram-group "-5006066016" \
  --timeout 120 > /tmp/codex-search.log 2>&1 &
```

调度后：告知用户搜索正在运行，结果将通过 Telegram 发送。**不要轮询**。

### 同步模式（短查询示例）

```powershell
node "D:\CustomBuild\Project\oh-my-opencode\codex-deep-search\scripts\search.js" `
    --mode "foreground" `
    --prompt "快速事实查询" `
    --output "D:\CustomBuild\Project\oh-my-opencode\codex-deep-search\data\search-result.md" `
    --timeout 60
```

然后读取输出文件并总结。

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--prompt` | 是 | — | 研究查询内容 |
| `--output` | 否 | `data\codex-search-results\<task>.md` | 输出文件路径 |
| `--task-name` | 否 | `search-<时间戳>` | 任务标识符 |
| `--telegram-group` | 否 | — | Telegram 聊天 ID（用于回调） |
| `--model` | 否 | `gpt-5.3-codex` | 模型覆盖 |
| `--mode` | 否 | `foreground` | 运行模式：`foreground`（主线程）或 `dispatch`（后台） |
| `--codex-bin` | 否 | `%APPDATA%\npm\codex.cmd` | Codex 可执行文件路径 |
| `--openclaw-bin` | 否 | `%APPDATA%\npm\openclaw.cmd` | Openclaw 可执行文件路径 |
| `--timeout` | 否 | `120` | 自动停止的秒数 |

## 结果文件

| 文件 | 内容 |
|------|------|
| `data\codex-search-results\<task>.md` | 搜索报告（增量写入） |
| `data\codex-search-results\latest-meta.json` | 任务元数据 + 状态 |
| `data\codex-search-results\task-output.txt` | Codex 原始输出 |

## 关键设计

- **增量写入** — 每轮搜索后保存结果，可应对 OOM/超时
- **低推理努力** — 降低内存占用，防止 OOM SIGKILL
- **超时保护** — 自动停止失控的搜索
- **调度模式** — 后台执行 + Telegram 回调，无轮询
