@echo off
call npx tsc --noEmit
echo SERVER_TSC_EXIT=%ERRORLEVEL%
