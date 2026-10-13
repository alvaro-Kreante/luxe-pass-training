const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 7.1 — "Search/filter guests by date" en /partner (DayStepper compartido con /admin/bookings).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/partner');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('console', msg.text().slice(0, 300)); });

  await page.goto(`${BASE}/partner/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('dana.okafor@theainsworth.com');
  await page.getByLabel('Password').fill('AinsworthFOH!24');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/partner(?!\/login)/, { timeout: 15000 });
  await page.getByRole('heading', { name: "Today's guests" }).waitFor();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'guests-today.png') });
  console.log('shot guests-today.png');

  await page.getByRole('button', { name: 'Next day' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'guests-next-day.png') });
  console.log('shot guests-next-day.png');

  await browser.close();
})();
