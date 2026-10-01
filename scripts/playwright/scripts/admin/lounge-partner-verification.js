const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 10.5 — partner en la lista, en el borrador y en el lounge live (Fase 10 · 9, 10, 12).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const LIVE = process.env.LOUNGE_ID || 'halcyon-reading-room';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true }); console.log('shot', name); };

  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('alvaro+admin@kreante.co');
  await page.getByLabel('Password').fill('Pa$$w0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });

  await page.goto(BASE + '/admin/lounges', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Open / }).first().waitFor();
  await shot('lounges-with-partner.png');

  await page.goto(BASE + '/admin/lounges/' + LIVE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('region', { name: 'Partner' }).waitFor();
  await shot('lounge-partner-card.png');

  await page.goto(BASE + '/admin/lounges/new', { waitUntil: 'domcontentloaded' });
  const picker = page.getByRole('combobox', { name: 'Who runs this lounge' });
  await picker.waitFor();
  await picker.click();
  await picker.fill('hal');
  await page.getByRole('option').first().waitFor();
  await shot('lounge-draft-partner.png');

  await browser.close();
})();
