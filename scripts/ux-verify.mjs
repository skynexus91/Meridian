import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
const OUT = 'qa-shots/ux';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};

async function shot(name, opts, action) {
  const ctx = await browser.newContext({ geolocation: { latitude: 44.4268, longitude: 26.1025 }, permissions: ['geolocation'], ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:3001', { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  try {
    await action(page);
  } catch (e) {
    results[name + '-error'] = String(e).slice(0, 200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  results[name + '-errors'] = errors;
  await ctx.close();
}

await shot('v3-desktop-layers', { viewport: { width: 1440, height: 900 } }, async (page) => {
  await page.getByRole('button', { name: /^Layers$/ }).click();
  await page.waitForTimeout(500);
  results.layerRows = await page.locator('.layers-row').count();
  results.layerBox = await page.locator('.layers-popover').boundingBox();
  results.lastRowVisible = await page.locator('.layers-row').last().isVisible();
  // Escape closes
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  results.escClosed = (await page.locator('.layers-popover').count()) === 0;
  // reopen, outside click closes
  await page.getByRole('button', { name: /^Layers$/ }).click();
  await page.waitForTimeout(300);
  await page.mouse.click(1100, 700);
  await page.waitForTimeout(300);
  results.outsideClosed = (await page.locator('.layers-popover').count()) === 0;
  // reopen for the screenshot
  await page.getByRole('button', { name: /^Layers$/ }).click();
  await page.waitForTimeout(400);
});

await shot('v3-mobile-layers', { ...devices['Pixel 7'] }, async (page) => {
  await page.getByRole('button', { name: /^Layers$/ }).click();
  await page.waitForTimeout(500);
  results.mobileLayerRows = await page.locator('.layers-row').count();
  results.mobileLayerBox = await page.locator('.layers-popover').boundingBox();
});

await shot('v3-mobile-chips', { ...devices['Pixel 7'] }, async (page) => {
  results.chipButtons = await page.locator('.map-category-chips > button').count();
  await page.locator('.map-category-chips').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await page.waitForTimeout(400);
});

await browser.close();
console.log(JSON.stringify(results, null, 2));
