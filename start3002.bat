@echo off
set PORT=3002
set DISABLE_SCHEDULER=1
start /b "" cmd /c "npm start"
timeout /t 7 >nul
echo BACKEND_UP>backendup.txt
