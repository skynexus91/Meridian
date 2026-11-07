@echo off
call npm test > unit6.txt 2>&1
echo UNIT6_EXIT=%ERRORLEVEL%
