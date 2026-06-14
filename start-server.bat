@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  set "NODE_EXE=node"
) else (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if "%NODE_EXE%"=="node" (
  node server.js
  pause
  exit /b %errorlevel%
)

if not exist "%NODE_EXE%" (
  echo Node.js was not found on PATH or in the Codex bundled runtime.
  echo Install Node.js or run from a shell where node is available.
  pause
  exit /b 1
)

"%NODE_EXE%" server.js
pause
