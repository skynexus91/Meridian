@echo off
set TEST_BASE_URL=http://127.0.0.1:3002
call npx playwright test --config=playwright.production.config.ts --project=mobile --reporter=line > goqmobile.txt 2>&1
echo MOBILE_EXIT=%ERRORLEVEL%
