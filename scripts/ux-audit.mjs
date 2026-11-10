import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';
const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const OUT = 'qa-shots/ux';
fs.mkdirSync(OUT, { recursive: true });
const report = { console: [], failed: [], notes: [], flows: [] };

async function audit(page, label) {
  const d = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const buttons = [...document.querySelectorAll('button')].filter(vis);
    const small = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40);
    }).map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40));
    const unnamed = buttons.filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim() || b.title)).length;
    const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis);
    const unlabeled = inputs.filter((i) => !(i.getAttribute('aria-label') || (i.id && document.querySelector('label[for="' + i.id + '"]')) || i.closest('label') || i.placeholder)).length;
    return {
      docWidth: document.documentElement.scrollWidth,
      vw: innerWidth,
      hOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      buttons: buttons.length,
      unnamed,
      smallTargets: small,
      inputs: inputs.length,
      unlabeled,
      lang: document.documentElement.lang,
    };
  });
  report.notes.push({ label, ...d });
}

async function run(name, opts, flow) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    geolocation: { latitude: 44.4268, longitude: 26.1025 },
    permissions: ['geolocation'],
    ...opts,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) report.console.push({ where: name, type: m.type(), text: m.text().slice(0, 300) });
  });
  page.on('pageerror', (e) => report.console.push({ where: name, type: 'pageerror', text: String(e).slice(0, 300) }));
  page.on('response', (r) => {
    if (r.status() >= 400) report.failed.push({ where: name, status: r.status(), url: r.url().slice(0, 180) });
  });
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  report.flows.push({ name, loadMs: Date.now() - t0 });
  try {
    await flow(page, name);
  } catch (e) {
    report.flows.push({ name, error: String(e).slice(0, 300) });
  }
  await audit(page, name);
  await browser.close();
}

const desktop = { viewport: { width: 1440, height: 900 } };

await run('desktop', desktop, async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}-1-home.png` });
  const side = page.getByRole('button', { name: /Panou lateral|Side panel/ });
  if (await side.count()) {
    await side.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}-2-menu.png` });
    const close = page.getByRole('button', { name: /Închide meniul|Close menu/ });
    if (await close.count()) await close.click();
  }
});

await run('mobile', { ...devices['Pixel 7'] }, async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}-1-home.png` });
  const menu = page.getByRole('button', { name: /Panou lateral|Side panel/ });
  if (await menu.count()) {
    await menu.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}-2-menu.png` });
  }
  const nav = page.getByRole('button', { name: /Naviga|Navigation/ }).first();
  if (await nav.count()) {
    await nav.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}-3-nav.png` });
  }
});

await run('route-flow', desktop, async (page, name) => {
  const t = Date.now();
  const dest = page.getByRole('textbox', { name: /Destinație|Destination/ }).first();
  if (await dest.count()) {
    await dest.click();
    await dest.fill('Cluj-Napoca');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}-1-suggest.png` });
    const suggestion = page.getByRole('button', { name: /Cluj-Napoca/ }).first();
    if (await suggestion.count()) await suggestion.click();
    await page.waitForTimeout(600);
    const find = page.getByRole('button', { name: /Calculează traseul|Find route|Route/ }).first();
    if (await find.count()) {
      await find.click();
      await page.waitForTimeout(9000);
      await page.screenshot({ path: `${OUT}/${name}-2-route.png` });
      report.flows.push({ name: 'route-plan', ms: Date.now() - t });
      const start = page.getByRole('button', { name: /Pornește|Start/ }).first();
      if (await start.count()) {
        await start.click();
        await page.waitForTimeout(7000);
        await page.screenshot({ path: `${OUT}/${name}-3-navigating.png` });
      }
    }
  } else report.flows.push({ name: 'route-plan', error: 'destination input not found' });
});

await run('layers-weather', desktop, async (page, name) => {
  const layers = page.getByRole('button', { name: /Straturi|Layers/ }).first();
  if (await layers.count()) {
    await layers.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${name}-1-layers.png` });
  }
});

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ flows: report.flows, notes: report.notes, console: report.console.slice(0, 25), failed: report.failed.slice(0, 25) }, null, 2));
