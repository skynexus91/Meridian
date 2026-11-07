@echo off
call npm run build > buildv2.log 2>&1
echo B2_EXIT=%ERRORLEVEL%
