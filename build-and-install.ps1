$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host "  oh-my-opencode Build & Install"
Write-Host "============================================"
Write-Host ""

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pluginDir = Join-Path $env:USERPROFILE ".config\opencode\plugins\oh-my-opencode"
$parentDir = Split-Path $pluginDir -Parent

Set-Location $sourceDir

# 检查 bun
if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] bun is not installed!" -ForegroundColor Red
    Write-Host "Please install bun first: https://bun.sh"
    Read-Host "Press Enter to exit"
    exit 1
}

# 安装依赖
Write-Host "[1/4] Installing dependencies..."
bun install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 构建
Write-Host ""
Write-Host "[2/4] Building plugin..."
bun run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 准备目录
Write-Host ""
Write-Host "[3/4] Preparing plugin directory..."

if (!(Test-Path $parentDir)) {
    Write-Host "Creating plugins directory..."
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

if (Test-Path $pluginDir) {
    Write-Host "Removing old installation..."
    Remove-Item -Recurse -Force $pluginDir
}

New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null

# 复制文件
Write-Host ""
Write-Host "[4/4] Copying plugin files..."

Copy-Item -Recurse -Force (Join-Path $sourceDir "dist") (Join-Path $pluginDir "dist")
Copy-Item -Force (Join-Path $sourceDir "package.json") $pluginDir

# 复制 node_modules
$nodeModules = Join-Path $sourceDir "node_modules"
if (Test-Path $nodeModules) {
    Write-Host "Copying node_modules (this may take a while)..."
    Copy-Item -Recurse -Force $nodeModules (Join-Path $pluginDir "node_modules")
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Build & Install Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Plugin installed to:"
Write-Host "  $pluginDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please restart OpenCode to load the plugin."
Write-Host ""

Read-Host "Press Enter to exit"
