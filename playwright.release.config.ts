import {defineConfig} from '@playwright/test';
import config from './playwright.production.config';
export default defineConfig({...config,testMatch:['**/navigation.spec.ts','**/release.spec.ts'],globalTimeout:1200000,use:{...config.use,baseURL:process.env.TEST_BASE_URL??'http://127.0.0.1:3002'}});
