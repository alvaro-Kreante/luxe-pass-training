const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 10.2 — listado de /admin/partners (Partners.dc.html, Fase 10 · 1).
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

  await page.goto(`${BASE}/admin/partners`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Open / }).first().waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'partners-list.png') });
  console.log('shot partners-list.png');

  await page.getByRole('button', { name: /^Draft/ }).click();
  await page.screenshot({ path: path.join(OUT_DIR, 'partners-list-draft.png') });
  console.log('shot partners-list-draft.png');

  await browser.close();
})();
