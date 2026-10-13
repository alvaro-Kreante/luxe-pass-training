const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 8.4 — Bookings Overview (Bookings.dc.html, artboard 29 de Epic 8).
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

  await page.getByRole('link', { name: 'Bookings' }).click();
  await page.getByRole('heading', { name: 'Who is coming' }).waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'bookings-overview.png') });
  console.log('shot bookings-overview.png');

  const lounge = page.getByRole('combobox', { name: 'Lounge' });
  const options = await lounge.locator('option').allTextContents();
  if (options.length > 1) {
    await lounge.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, 'bookings-overview-lounge.png') });
    console.log('shot bookings-overview-lounge.png');
  }

  await browser.close();
})();
