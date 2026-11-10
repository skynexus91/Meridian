import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./tests/e2e',
 outputDir:'./test-results/dev-artifacts',
 timeout:90000,
 fullyParallel:false,
 workers:1,
 retries:0,
 use:{
  baseURL:'http://127.0.0.1:5173',
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
  launchOptions:{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']},
 },
 webServer:{
  command:'npm run dev',
  url:'http://127.0.0.1:5173/api/health',
  reuseExistingServer:!process.env.CI,
  timeout:30000,
  env:{DISABLE_SCHEDULER:'1'},
 },
 projects:[
  {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
  {name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
 ],
});
