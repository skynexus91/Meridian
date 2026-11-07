@echo off
call npm run build > buildv.log 2>&1
echo B_EXIT=%ERRORLEVEL%
