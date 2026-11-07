@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 26.12 or newer, then run this file again.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit((a===24&&b>=22)||(a>=26&&b>=12)?0:1)"
if errorlevel 1 (
  echo This app needs Node.js 24.22 or Node.js 26.12 or newer.
  pause
  exit /b 1
)
node --input-type=module -e "try {const r=await fetch('http://127.0.0.1:3001/api/health',{signal:AbortSignal.timeout(1500)});if(r.ok&&(await r.json()).app==='meridian')process.exit(0);}catch{}process.exit(1);"
if not errorlevel 1 (
  echo Meridian is already running at http://127.0.0.1:3001/
  start "" http://127.0.0.1:3001/
  exit /b 0
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 goto failed
)
echo Building Meridian. This can take a minute on the first launch.
call npm.cmd run build
if errorlevel 1 goto failed
echo Open http://127.0.0.1:3001/ in your browser after the API reports ready.
call npm.cmd start
if errorlevel 1 goto failed
exit /b 0
:failed
echo Meridian could not start. The error is shown above.
pause
exit /b 1
