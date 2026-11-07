@echo off
call npx tsc --noEmit
echo TSC_EXIT=%ERRORLEVEL%
