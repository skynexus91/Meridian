import {defineConfig} from '@playwright/test';
import config from './playwright.config';

const port='4173';
const externalBaseURL=process.env.TEST_BASE_URL?.trim()||undefined;
const baseURL=externalBaseURL??`http://127.0.0.1:${port}`;

export default defineConfig({
 ...config,
 outputDir:'./test-results/production-artifacts',
 use:{...config.use,baseURL},
 globalSetup:'./tests/e2e/production-setup.ts',
 webServer:externalBaseURL?undefined:{
  command:'npm start',
  url:`${baseURL}/api/health`,
  timeout:60000,
  reuseExistingServer:false,
  env:{PORT:port,HOST:'127.0.0.1',DATABASE_PATH:':memory:',DISABLE_SCHEDULER:'1'},
 },
});
