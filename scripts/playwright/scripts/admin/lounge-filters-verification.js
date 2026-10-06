const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 8.3 — filtros de /admin/lounges (artboards 11, 27 y 28 de Epic 8).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('console', msg.text().slice(0, 300)); });

  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('alvaro+admin@kreante.co');
  await page.getByLabel('Password').fill('Pa$$w0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });

  await page.goto(`${BASE}/admin/lounges`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Open / }).first().waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'lounge-filters-list.png') });
  console.log('shot lounge-filters-list.png');

  await page.getByRole('button', { name: /^Live/ }).click();
  await page.getByRole('button', { name: 'All cities' }).click();
  await page.getByRole('searchbox', { name: 'Search cities' }).fill('Mi');
  await page.screenshot({ path: path.join(OUT_DIR, 'lounge-filters-city.png') });
  console.log('shot lounge-filters-city.png');

  const option = page.getByRole('option').first();
  if (await option.count()) {
    await option.click();
    await page.screenshot({ path: path.join(OUT_DIR, 'lounge-filters-applied.png') });
    console.log('shot lounge-filters-applied.png');
  }

  await browser.close();
})();
