import {defineConfig} from '@playwright/test';
import config from './playwright.config';
export default defineConfig({...config,use:{...config.use,baseURL:process.env.TEST_BASE_URL??'http://127.0.0.1:3001'}});
