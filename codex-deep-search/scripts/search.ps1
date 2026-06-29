# Codex CLI 深度搜索 - 调度模式（后台执行 + Telegram 回调）
# 使用 PowerShell 实现，支持 Windows 原生运行

$ErrorActionPreference = "Stop"

# ========== 路径配置 ==========
$BASE_DIR = "D:\CustomBuild\Project\oh-my-opencode\codex-deep-search"
$RESULT_DIR = Join-Path $BASE_DIR "data\codex-search-results"
$CODEX_BIN = $env:CODEX_BIN ?: (Join-Path $env:USERPROFILE ".npm-global\bin\codex")

# ========== 默认值 ==========
$Prompt = ""
$Output = ""
$Model = "gpt-5.3-codex"
$Sandbox = "workspace-write"
$Timeout = 120
$TelegramGroup = ""
$TaskName = "search-$(Get-Date -Format 'yyyyMMddHHmmss')"

# ========== 参数解析 ==========
$i = 0
while ($i -lt $args.Count) {
    switch ($args[$i]) {
        "--prompt" { $Prompt = $args[++$i]; $i++ }
        "--output" { $Output = $args[++$i]; $i++ }
        "--model" { $Model = $args[++$i]; $i++ }
        "--timeout" { $Timeout = [int]$args[++$i]; $i++ }
        "--telegram-group" { $TelegramGroup = $args[++$i]; $i++ }
        "--task-name" { $TaskName = $args[++$i]; $i++ }
        default { Write-Host "未知参数: $($args[$i])"; exit 1 }
    }
}

# ========== 参数校验 ==========
if ([string]::IsNullOrEmpty($Prompt)) {
    Write-Host "错误: --prompt 是必填参数"
    exit 1
}

# ========== 初始化目录 ==========
if (-not (Test-Path $RESULT_DIR)) {
    New-Item -ItemType Directory -Path $RESULT_DIR -Force | Out-Null
}

# ========== 默认输出路径 ==========
if ([string]::IsNullOrEmpty($Output)) {
    $Output = Join-Path $RESULT_DIR "$TaskName.md"
}

# ========== 写入任务元数据 ==========
$StartedAt = (Get-Date).ToString("o")
$Metadata = @{
    task_name = $TaskName
    prompt = $Prompt
    output = $Output
    started_at = $StartedAt
    status = "running"
} | ConvertTo-Json -Compress
$Metadata | Set-Content -Path (Join-Path $RESULT_DIR "latest-meta.json") -Encoding UTF8

# ========== 搜索指令 ==========
$SearchInstruction = @"
你是一个研究助手。请搜索以下查询的网络资源。

关键规则：
1. 将发现内容增量写入 $Output — 每次搜索后立即追加。不要等到最后。
2. 文件开头写标题和查询，然后追加发现的内容章节。
3. 保持搜索聚焦 — 最多 8 次网络搜索。综合已有内容，不要过度研究。
4. 内联包含来源 URL。
5. 结尾写简要摘要章节。

查询: $Prompt

现在先写文件头部，然后搜索并追加。
"@

# ========== 输出启动信息 ==========
Write-Host "[codex-deep-search] 任务: $TaskName"
Write-Host "[codex-deep-search] 输出: $Output"
Write-Host "[codex-deep-search] 模型: $Model | 推理: 低 | 超时: ${Timeout}秒"

# ========== 预创建输出文件 ==========
$Header = @"
# 深度搜索报告

**查询:** $Prompt
**状态:** 进行中...
---
"@
$Header | Set-Content -Path $Output -Encoding UTF8

# ========== 运行 Codex（带超时） ==========
$CodexArgs = @(
    "exec"
    "--model", $Model
    "--full-auto"
    "--sandbox", $Sandbox
    "-c", 'model_reasoning_effort="low"'
    $SearchInstruction
)

# 使用 Start-Process 配合超时实现
$Process = Start-Process -FilePath $CODEX_BIN -ArgumentList $CodexArgs -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $RESULT_DIR "task-output.txt") -RedirectStandardError (Join-Path $RESULT_DIR "task-error.txt")

# 等待超时
$TimedOut = $false
$Completed = $Process.WaitForExit($Timeout * 1000)

if (-not $Completed) {
    $Process.Kill()
    $TimedOut = $true
    Write-Host "[codex-deep-search] 进程超时被终止"
}

$ExitCode = $Process.ExitCode

# ========== 追加完成标记 ==========
if (Test-Path $Output) {
    $CompletionMark = "`n`n---`n_搜索完成于 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC_"
    $CompletionMark | Add-Content -Path $Output -Encoding UTF8
}

# ========== 计算耗时 ==========
$Lines = (Get-Content $Output -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
$CompletedAt = (Get-Date).ToString("o")
$StartedTs = [DateTimeOffset]::Parse($StartedAt).ToUnixTimeSeconds()
$EndedTs = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$Elapsed = $EndedTs - $StartedTs
$Minutes = [Math]::Floor($Elapsed / 60)
$Seconds = $Elapsed % 60
$Duration = "${Minutes}m${Seconds}s"

# ========== 更新元数据 ==========
$FinalMetadata = @{
    task_name = $TaskName
    prompt = $Prompt
    output = $Output
    started_at = $StartedAt
    completed_at = $CompletedAt
    duration = $Duration
    lines = $Lines
    exit_code = $ExitCode
    status = if ($ExitCode -eq 0) { "done" } elseif ($TimedOut -or $ExitCode -eq 124) { "timeout" } else { "failed" }
} | ConvertTo-Json -Compress
$FinalMetadata | Set-Content -Path (Join-Path $RESULT_DIR "latest-meta.json") -Encoding UTF8

Write-Host "[codex-deep-search] 完成 (耗时=${Duration}, 退出码=${ExitCode}, ${Lines} 行)"

# ========== Telegram 通知 ==========
if (-not [string]::IsNullOrEmpty($TelegramGroup) -and (Test-Path $env:OPENCLAW_BIN)) {
    $OpenclawBin = $env:OPENCLAW_BIN

    if ($ExitCode -eq 124 -or $TimedOut) { $StatusEmoji = "⏱" }
    elseif ($ExitCode -ne 0) { $StatusEmoji = "❌" }
    else { $StatusEmoji = "✅" }

    # 提取摘要（跳过前几行头部，取 5-30 行，最多 800 字符）
    $Summary = ""
    if (Test-Path $Output) {
        $Content = Get-Content $Output -Encoding UTF8
        if ($Content.Count -gt 4) {
            $Summary = ($Content[4..[Math]::Min(29, $Content.Count-1)] -join "`n") | Select-Object -First 800
        }
    }
    if ([string]::IsNullOrEmpty($Summary)) { $Summary = "无结果" }

    $Message = "${StatusEmoji} *Deep Search 完成*

🔍 *查询:* ${Prompt}
⏱ *耗时:* ${Duration} | 📄 ${Lines} 行
📂 `${Output}`

📝 *摘要:*
${Summary}"

    & $OpenclawBin message send --channel telegram --target $TelegramGroup --message $Message 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[codex-deep-search] Telegram 通知发送失败"
    }
}

# ========== 唤醒 AGI（通过 /hooks/wake）==========
$GatewayPort = if ($env:OPENCLAW_GATEWAY_PORT) { $env:OPENCLAW_GATEWAY_PORT } else { "18789" }
$HookToken = ""
$OpenclawConfig = Join-Path $env:USERPROFILE ".openclaw\openclaw.json"

if (Test-Path $OpenclawConfig) {
    try {
        $Config = Get-Content $OpenclawConfig -Encoding UTF8 | ConvertFrom-Json
        $HookToken = $Config.hooks.token
    } catch {
        Write-Host "[codex-deep-search] 读取 openclaw 配置失败: $_"
    }
}

if (-not [string]::IsNullOrEmpty($HookToken)) {
    $Status = (Get-Content (Join-Path $RESULT_DIR "latest-meta.json") -Encoding UTF8 | ConvertFrom-Json).status
    $WakeText = "[DEEP_SEARCH_DONE] task=${TaskName} output=${Output} lines=${Lines} duration=${Duration} status=${Status}"
    $Body = @{ text = $WakeText; mode = "now" } | ConvertTo-Json

    try {
        $Response = Invoke-RestMethod -Uri "http://localhost:${GatewayPort}/hooks/wake" `
            -Method Post `
            -ContentType "application/json" `
            -Headers @{ "Authorization" = "Bearer ${HookToken}" } `
            -Body $Body

        Write-Host "[codex-deep-search] Wake 请求已发送"
    } catch {
        Write-Host "[codex-deep-search] Wake 请求失败: $_"
    }
} else {
    Write-Host "[codex-deep-search] 无 hook token，跳过 wake"
}
