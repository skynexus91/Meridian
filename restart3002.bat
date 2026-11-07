@echo off
taskkill /F /PID 6384 >nul 2>&1
timeout /t 3 >nul
set PORT=3002
set DISABLE_SCHEDULER=1
start "meridian" /b cmd /c "npm start > backend3002.log 2>&1"
timeout /t 6 >nul
echo BACKEND_RESTARTED
