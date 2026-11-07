@echo off
set PORT=3002
set DISABLE_SCHEDULER=1
set TEST_BASE_URL=http://127.0.0.1:3002
start /b "" npm start
timeout /t 5
npx playwright test tests/e2e/navigation.spec.ts --config=playwright.production.config.ts --reporter=list
