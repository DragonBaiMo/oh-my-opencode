#!/usr/bin/env node
// Codex CLI 深度搜索
// 默认前台执行: 主线程等待调研完成后返回

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import http from "node:http";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);

const BASE_DIR =
  process.env.CODEX_DEEP_SEARCH_BASE_DIR ||
  "D:\\CustomBuild\\Project\\oh-my-opencode\\codex-deep-search";

const RESULT_DIR = path.join(BASE_DIR, "data", "codex-search-results");
const DEFAULT_CODEX_BIN =
  process.env.CODEX_BIN ||
  path.join(process.env.APPDATA || "", "npm", "codex.cmd");
const DEFAULT_OPENCLAW_BIN =
  process.env.OPENCLAW_BIN ||
  path.join(process.env.APPDATA || "", "npm", "openclaw.cmd");

/** @typedef {{
 * prompt: string;
 * output: string;
 * model: string;
 * timeout: number;
 * telegramGroup: string;
 * taskName: string;
 * mode: "foreground" | "dispatch";
 * sandbox: string;
 * codexBin: string;
 * openclawBin: string;
 * }} SearchOptions */

/**
 * @returns {SearchOptions}
 */
function parseArgs() {
  const args = process.argv.slice(2);

  const options = {
    prompt: "",
    output: "",
    model: "gpt-5.3-codex",
    timeout: 120,
    telegramGroup: "",
    taskName: `search-${Date.now()}`,
    mode: "foreground",
    sandbox: "workspace-write",
    codexBin: DEFAULT_CODEX_BIN,
    openclawBin: DEFAULT_OPENCLAW_BIN,
  };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    switch (key) {
      case "--prompt":
        options.prompt = args[++i] || "";
        break;
      case "--output":
        options.output = args[++i] || "";
        break;
      case "--model":
        options.model = args[++i] || options.model;
        break;
      case "--timeout": {
        const raw = args[++i] || "";
        const parsed = Number.parseInt(raw, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error(`--timeout 非法: ${raw}`);
        }
        options.timeout = parsed;
        break;
      }
      case "--telegram-group":
        options.telegramGroup = args[++i] || "";
        break;
      case "--task-name":
        options.taskName = args[++i] || options.taskName;
        break;
      case "--mode": {
        const mode = args[++i] || "";
        if (mode === "foreground" || mode === "dispatch") {
          options.mode = mode;
        } else {
          throw new Error(`--mode 仅支持 foreground 或 dispatch: ${mode}`);
        }
        break;
      }
      case "--sandbox":
        options.sandbox = args[++i] || options.sandbox;
        break;
      case "--codex-bin":
        options.codexBin = args[++i] || options.codexBin;
        break;
      case "--openclaw-bin":
        options.openclawBin = args[++i] || options.openclawBin;
        break;
      default:
        throw new Error(`未知参数: ${key}`);
    }
  }

  if (!options.prompt) {
    throw new Error("--prompt 是必填参数");
  }

  if (!options.output) {
    options.output = path.join(RESULT_DIR, `${options.taskName}.md`);
  }

  return options;
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function shouldUseWindowsShell(binPath) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(binPath);
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

function readFileSummary(filePath, maxChars = 800) {
  if (!fs.existsSync(filePath)) {
    return "无结果";
  }

  const content = fs.readFileSync(filePath, "utf8").split("\n");
  if (content.length <= 4) {
    return "无结果";
  }

  return content.slice(4, Math.min(30, content.length)).join("\n").slice(0, maxChars);
}

function lineCount(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw) {
    return 0;
  }

  return raw.split("\n").length;
}

function durationFrom(startedAt, endedAt) {
  const elapsed = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}m${seconds}s`;
}

function sendWake({ taskName, output, lines, duration, status }) {
  const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || "18789";
  const openclawConfigPath = path.join(process.env.USERPROFILE || "", ".openclaw", "openclaw.json");

  if (!fs.existsSync(openclawConfigPath)) {
    console.log("[codex-deep-search] 未找到 openclaw 配置, 跳过 wake");
    return;
  }

  let hookToken = "";
  try {
    const config = JSON.parse(fs.readFileSync(openclawConfigPath, "utf8"));
    hookToken = config?.hooks?.token || "";
  } catch (error) {
    console.log(`[codex-deep-search] 读取 openclaw 配置失败: ${String(error)}`);
    return;
  }

  if (!hookToken) {
    console.log("[codex-deep-search] hook token 为空, 跳过 wake");
    return;
  }

  const wakeText = `[DEEP_SEARCH_DONE] task=${taskName} output=${output} lines=${lines} duration=${duration} status=${status}`;
  const body = JSON.stringify({ text: wakeText, mode: "now" });

  const req = http.request(
    {
      hostname: "localhost",
      port: gatewayPort,
      path: "/hooks/wake",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hookToken}`,
      },
    },
    (res) => {
      console.log(`[codex-deep-search] Wake 已发送 (HTTP ${res.statusCode || "unknown"})`);
    },
  );

  req.on("error", (error) => {
    console.log(`[codex-deep-search] Wake 发送失败: ${String(error)}`);
  });

  req.write(body);
  req.end();
}

async function sendTelegram(options, meta) {
  const { telegramGroup, openclawBin, prompt, output } = options;
  if (!telegramGroup) {
    return;
  }

  if (!fs.existsSync(openclawBin)) {
    console.log(`[codex-deep-search] OPENCLAW_BIN 不存在: ${openclawBin}`);
    return;
  }

  const statusEmoji = meta.status === "done" ? "✅" : meta.status === "timeout" ? "⏱" : "❌";
  const summary = readFileSummary(output, 800);

  const message = `${statusEmoji} *Deep Search 完成*\n\n🔍 *查询:* ${prompt}\n⏱ *耗时:* ${meta.duration} | 📄 ${meta.lines} 行\n📂 \`${output}\`\n\n📝 *摘要:*\n${summary}`;

  await new Promise((resolve) => {
    const proc = spawn(
      openclawBin,
      [
        "message",
        "send",
        "--channel",
        "telegram",
        "--target",
        telegramGroup,
        "--message",
        message,
      ],
      {
        stdio: "ignore",
        shell: shouldUseWindowsShell(openclawBin),
      },
    );

    proc.on("close", (code) => {
      if (code !== 0) {
        console.log(`[codex-deep-search] Telegram 发送失败, exit=${code}`);
      }
      resolve(undefined);
    });

    proc.on("error", (error) => {
      console.log(`[codex-deep-search] Telegram 发送异常: ${String(error)}`);
      resolve(undefined);
    });
  });
}

function buildInstruction(options) {
  return `你是一个研究助手。请搜索以下查询的网络资源。

关键规则:
1. 将发现内容增量写入 ${options.output}, 每次搜索后立即追加, 不要等到最后。
2. 文件开头写标题和查询, 然后持续追加发现章节。
3. 保持搜索聚焦, 最多 8 次网络搜索。优先综合, 不要过度研究。
4. 每条结论附带来源 URL。
5. 结尾写简要摘要章节。

查询: ${options.prompt}

现在先写文件头部, 然后搜索并追加。`;
}

function writeInitialReport(options) {
  const header = `# 深度搜索报告

**查询:** ${options.prompt}
**状态:** 进行中...
---
`;
  fs.writeFileSync(options.output, header, "utf8");
}

function runForeground(options) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(options.codexBin)) {
      reject(new Error(`CODEX_BIN 不存在: ${options.codexBin}`));
      return;
    }

    const taskOutputPath = path.join(RESULT_DIR, "task-output.txt");
    const taskErrorPath = path.join(RESULT_DIR, "task-error.txt");

    const outStream = fs.createWriteStream(taskOutputPath, { flags: "w" });
    const errStream = fs.createWriteStream(taskErrorPath, { flags: "w" });

    let timedOut = false;
    let closed = false;

    const instruction = buildInstruction(options);

    const proc = spawn(options.codexBin, [
      "exec",
      "--model",
      options.model,
      "--full-auto",
      "--sandbox",
      options.sandbox,
      "-c",
      'model_reasoning_effort="low"',
      instruction,
    ], {
      shell: shouldUseWindowsShell(options.codexBin),
    });

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
      console.log(`[codex-deep-search] 超时终止: ${options.timeout}秒`);
    }, options.timeout * 1000);

    proc.stdout.on("data", (data) => {
      process.stdout.write(data);
      outStream.write(data);
    });

    proc.stderr.on("data", (data) => {
      process.stderr.write(data);
      errStream.write(data);
    });

    proc.on("error", (error) => {
      clearTimeout(timeoutHandle);
      outStream.end();
      errStream.end();
      reject(error);
    });

    proc.on("close", (code) => {
      if (closed) {
        return;
      }
      closed = true;
      clearTimeout(timeoutHandle);
      outStream.end();
      errStream.end();
      resolve({ exitCode: code ?? 1, timedOut });
    });
  });
}

function runDispatch(options) {
  const forwardArgs = [
    SCRIPT_PATH,
    "--mode",
    "foreground",
    "--prompt",
    options.prompt,
    "--task-name",
    options.taskName,
    "--timeout",
    String(options.timeout),
    "--model",
    options.model,
    "--sandbox",
    options.sandbox,
    "--codex-bin",
    options.codexBin,
    "--openclaw-bin",
    options.openclawBin,
  ];

  if (options.output) {
    forwardArgs.push("--output", options.output);
  }

  if (options.telegramGroup) {
    forwardArgs.push("--telegram-group", options.telegramGroup);
  }

  const child = spawn(process.execPath, forwardArgs, {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });

  child.unref();
}

async function main() {
  let options;
  try {
    options = parseArgs();
  } catch (error) {
    console.error(`[codex-deep-search] 参数错误: ${String(error)}`);
    process.exit(1);
    return;
  }

  ensureDirExists(RESULT_DIR);
  ensureDirExists(path.dirname(options.output));

  const startedAt = new Date();
  const metadataPath = path.join(RESULT_DIR, "latest-meta.json");

  writeJson(metadataPath, {
    task_name: options.taskName,
    prompt: options.prompt,
    output: options.output,
    started_at: startedAt.toISOString(),
    mode: options.mode,
    status: "running",
  });

  if (options.mode === "dispatch") {
    runDispatch(options);
    console.log(`[codex-deep-search] 已调度后台任务: ${options.taskName}`);
    console.log(`[codex-deep-search] 输出文件: ${options.output}`);
    return;
  }

  console.log(`[codex-deep-search] 任务: ${options.taskName}`);
  console.log(`[codex-deep-search] 模式: foreground`);
  console.log(`[codex-deep-search] 输出: ${options.output}`);
  console.log(`[codex-deep-search] 模型: ${options.model} | 超时: ${options.timeout}秒`);

  writeInitialReport(options);

  let execution;
  try {
    execution = await runForeground(options);
  } catch (error) {
    const endedAt = new Date();
    const meta = {
      task_name: options.taskName,
      prompt: options.prompt,
      output: options.output,
      started_at: startedAt.toISOString(),
      completed_at: endedAt.toISOString(),
      duration: durationFrom(startedAt, endedAt),
      lines: lineCount(options.output),
      exit_code: 1,
      status: "failed",
      error: String(error),
    };

    writeJson(metadataPath, meta);
    console.error(`[codex-deep-search] 执行失败: ${String(error)}`);
    process.exitCode = 1;
    return;
  }

  fs.appendFileSync(options.output, `\n\n---\n_搜索完成于 ${new Date().toISOString()}_`, "utf8");

  const endedAt = new Date();
  const status = execution.exitCode === 0 ? "done" : execution.timedOut ? "timeout" : "failed";
  const resultMeta = {
    task_name: options.taskName,
    prompt: options.prompt,
    output: options.output,
    started_at: startedAt.toISOString(),
    completed_at: endedAt.toISOString(),
    duration: durationFrom(startedAt, endedAt),
    lines: lineCount(options.output),
    exit_code: execution.exitCode,
    status,
  };

  writeJson(metadataPath, resultMeta);
  await sendTelegram(options, resultMeta);
  sendWake({
    taskName: options.taskName,
    output: options.output,
    lines: resultMeta.lines,
    duration: resultMeta.duration,
    status,
  });

  const summary = readFileSummary(options.output, 500);
  console.log(`[codex-deep-search] 完成: status=${status} exit=${execution.exitCode}`);
  console.log(`[codex-deep-search] 结果摘要:\n${summary}`);
  console.log(`[codex-deep-search] RESULT_JSON ${JSON.stringify(resultMeta)}`);

  if (status === "done") {
    process.exitCode = 0;
  } else if (status === "timeout") {
    process.exitCode = 124;
  } else {
    process.exitCode = execution.exitCode || 1;
  }
}

await main();
