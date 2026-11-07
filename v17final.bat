@echo off
set TEST_BASE_URL=http://127.0.0.1:3002
npx playwright test tests/e2e/navigation.spec.ts --config=playwright.production.config.ts --reporter=list --project=desktop -g "shows weather for the searched" > v17final.txt 2>&1
echo V17F_EXIT=%ERRORLEVEL%
