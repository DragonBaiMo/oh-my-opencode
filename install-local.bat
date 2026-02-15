@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   oh-my-opencode Local Plugin Installer
echo ============================================
echo.

:: 设置路径
set "SOURCE_DIR=%~dp0"
set "PLUGIN_DIR=%USERPROFILE%\.config\opencode\plugins\oh-my-opencode"

:: 检查 dist 目录是否存在
if not exist "%SOURCE_DIR%dist" (
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
    rmdir /s /q "%PLUGIN_DIR%"
)

:: 创建目标目录
mkdir "%PLUGIN_DIR%"

:: 复制必要文件
echo Copying plugin files...
xcopy /E /I /Q "%SOURCE_DIR%dist" "%PLUGIN_DIR%\dist"
copy /Y "%SOURCE_DIR%package.json" "%PLUGIN_DIR%\"

:: 复制 node_modules（如果需要运行时依赖）
if exist "%SOURCE_DIR%node_modules" (
    echo Copying dependencies...
    xcopy /E /I /Q "%SOURCE_DIR%node_modules" "%PLUGIN_DIR%\node_modules"
)

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo Plugin installed to:
echo   %PLUGIN_DIR%
echo.
echo Restart OpenCode to load the plugin.
echo.

pause
