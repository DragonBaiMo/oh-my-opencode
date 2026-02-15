@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   oh-my-opencode Dev Link Installer
echo ============================================
echo.

:: 设置路径
set "SOURCE_DIR=%~dp0"
set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"
set "PLUGIN_DIR=%USERPROFILE%\.config\opencode\plugins\oh-my-opencode"

:: 检查 dist 目录是否存在
if not exist "%SOURCE_DIR%\dist" (
    echo [ERROR] dist directory not found!
    echo Please run 'bun run build' first.
    exit /b 1
)

:: 创建插件目录
if not exist "%USERPROFILE%\.config\opencode\plugins" (
    echo Creating plugins directory...
    mkdir "%USERPROFILE%\.config\opencode\plugins"
)

:: 删除旧的安装（如果存在）
if exist "%PLUGIN_DIR%" (
    echo Removing old installation...
    rmdir /s /q "%PLUGIN_DIR%" 2>nul
    del /q "%PLUGIN_DIR%" 2>nul
)

:: 创建符号链接（需要管理员权限）
echo Creating symbolic link...
echo   From: %PLUGIN_DIR%
echo   To:   %SOURCE_DIR%
echo.

mklink /D "%PLUGIN_DIR%" "%SOURCE_DIR%"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to create symbolic link.
    echo Please run this script as Administrator.
    echo.
    echo Alternatively, run this command manually in an admin terminal:
    echo   mklink /D "%PLUGIN_DIR%" "%SOURCE_DIR%"
    exit /b 1
)

echo.
echo ============================================
echo   Dev Link Created!
echo ============================================
echo.
echo Plugin linked to: %SOURCE_DIR%
echo.
echo After modifying code, just run 'bun run build'
echo and restart OpenCode to see changes.
echo.

pause
