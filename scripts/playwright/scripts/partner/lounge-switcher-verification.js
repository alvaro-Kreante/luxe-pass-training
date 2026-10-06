const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 10.6 — selector de lounge en /partner (Fase 10 · 13, 14, 15). Usuaria de muestra de
// Halcyon Hotels (`scripts/seed-partners.mjs`).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/partner');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT_DIR, name) }); console.log('shot', name); };

  await page.goto(BASE + '/partner/login', { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).fill('camille.duarte@halcyonhotels.com');
  await page.getByLabel(/password/i).first().fill('HalcyonFOH!24');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/partner(?!\/login)/, { timeout: 15000 });

  await page.getByRole('button', { name: /^Lounge:/ }).waitFor();
  await shot('partner-today.png');
  await page.getByRole('button', { name: /^Lounge:/ }).click();
  await page.getByRole('menu', { name: 'Lounges' }).waitFor();
  await shot('partner-lounge-menu.png');

  await page.goto(BASE + '/partner/analytics', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Lounge:/ }).click();
  await page.getByRole('menu', { name: 'Lounges' }).waitFor();
  await shot('partner-analytics-all.png');

  await browser.close();
})();
