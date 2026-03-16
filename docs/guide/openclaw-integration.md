# OpenClaw 联动使用指南

本文档说明 `oh-my-opencode` 当前版本中 OpenClaw 的可用联动机制、开关条件与最小可用配置。

## 1. 机制概览

当前联动链路由 `openclaw-sender` hook 负责：

- 事件触发（`event`）
  - `session.created` -> `session-start`
  - `session.idle` -> `session-idle`
  - `session.deleted` -> `session-end`
- 工具触发（`tool.execute.before`）
  - `ask_user_question` / `askuserquestion` / `question` -> `ask-user-question`
  - `skill` 且参数为 `/stop-continuation` -> `stop`

随后统一进入 `wakeOpenClaw(...)`，按配置映射到 HTTP 或 command 网关发送。

## 2. 启用条件（必须同时满足）

1. 配置中启用 OpenClaw

```jsonc
{
  "openclaw": {
    "enabled": true,
    "gateways": {},
    "hooks": {}
  }
}
```

2. 环境变量启用总开关

```powershell
$env:OMO_OPENCLAW = "1"
```

3. `openclaw-sender` hook 未被禁用（即不在 `disabled_hooks` 里）

## 3. 最小可用配置（HTTP 网关）

将以下内容放到 `.opencode/oh-my-opencode.jsonc`：

```jsonc
{
  "openclaw": {
    "enabled": true,
    "gateways": {
      "oc-http": {
        "type": "http",
        "url": "https://your-openclaw-gateway.example.com/hooks/wake",
        "method": "POST",
        "timeout": 10000,
        "headers": {
          "Authorization": "Bearer ${OPENCLAW_TOKEN}"
        }
      }
    },
    "hooks": {
      "session-start": {
        "gateway": "oc-http",
        "instruction": "[OpenCode] 会话开始 project={{projectName}} session={{sessionId}}",
        "enabled": true
      },
      "session-idle": {
        "gateway": "oc-http",
        "instruction": "[OpenCode] 会话空闲 project={{projectName}} session={{sessionId}}",
        "enabled": true
      },
      "ask-user-question": {
        "gateway": "oc-http",
        "instruction": "[OpenCode] 需要用户输入: {{question}} (session={{sessionId}})",
        "enabled": true
      },
      "stop": {
        "gateway": "oc-http",
        "instruction": "[OpenCode] 收到 stop-continuation，session={{sessionId}}",
        "enabled": true
      }
    }
  }
}
```

## 4. Command 网关（可选）

如果使用 command 网关，除了 `OMO_OPENCLAW=1` 外，还必须显式开启：

```powershell
$env:OMO_OPENCLAW_COMMAND = "1"
```

示例：

```jsonc
{
  "openclaw": {
    "enabled": true,
    "gateways": {
      "oc-cmd": {
        "type": "command",
        "command": "python C:/tools/openclaw_send.py --event {{event}} --session {{sessionId}} --text {{instruction}}",
        "timeout": 5000
      }
    },
    "hooks": {
      "session-end": {
        "gateway": "oc-cmd",
        "instruction": "会话结束 {{sessionId}}",
        "enabled": true
      }
    }
  }
}
```

## 5. 可用模板变量

`instruction` 支持以下常用变量（未提供时会被替换为空）：

- `{{sessionId}}`
- `{{projectPath}}`
- `{{projectName}}`
- `{{question}}`
- `{{event}}`
- `{{timestamp}}`
- `{{tmuxSession}}`
- `{{tmuxTail}}`（stop/session-end 时可能自动采集）
- `{{replyChannel}}` / `{{replyTarget}}` / `{{replyThread}}`

## 6. 回复路由上下文（可选）

如需把来源渠道带到 OpenClaw，可设置：

```powershell
$env:OPENCLAW_REPLY_CHANNEL = "feishu"
$env:OPENCLAW_REPLY_TARGET  = "ou_xxx"
$env:OPENCLAW_REPLY_THREAD  = "thread_xxx"
```

## 7. 排错清单

1. 确认 `openclaw.enabled = true`
2. 确认 `OMO_OPENCLAW=1`
3. 确认 `disabled_hooks` 未包含 `openclaw-sender`
4. 确认事件映射存在且 `enabled=true`
5. HTTP 网关确保 URL 可达（优先 HTTPS；localhost 可用 HTTP）
6. command 网关额外确认 `OMO_OPENCLAW_COMMAND=1`

## 8. 兼容性说明

- 当前主链路为 `openclaw-sender`。
