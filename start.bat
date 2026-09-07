@echo off
setlocal

cd /d "%~dp0motion-demo-system"

if not exist "package.json" (
  echo Error: motion-demo-system\package.json not found.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm not found. Install Node.js first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Error: npm install failed.
    pause
    exit /b 1
  )
)

echo Starting MotionCaption at http://127.0.0.1:8010 ...
call npm run dev -- --host 127.0.0.1 --port 8010 --strictPort --open

if errorlevel 1 (
  echo.
  echo MotionCaption failed to start. Port 8010 may already be in use.
  pause
)

endlocal
