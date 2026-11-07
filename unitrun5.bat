@echo off
call npm test > unit5.txt 2>&1
echo UN5_EXIT=%ERRORLEVEL%
