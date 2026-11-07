@echo off
call npm test
echo UNIT_EXIT=%ERRORLEVEL%
