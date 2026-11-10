import {defineConfig} from '@playwright/test';
import config from './playwright.production.config';
export default defineConfig({...config,outputDir:'./test-results/release-artifacts',testMatch:['**/navigation.spec.ts','**/release.spec.ts'],globalTimeout:1200000});
