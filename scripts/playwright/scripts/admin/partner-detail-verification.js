const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 10.3 — alta y detalle de un partner (PartnerNew 2, PartnerDetail 3, PartnerUserEdit 4 · Fase 10).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const PARTNER_ID = process.env.PARTNER_ID || '501088a7-7ace-42e8-8c93-339206fd195a';
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

  await page.goto(`${BASE}/admin/partners/new`, { waitUntil: 'networkidle' });
  await page.getByLabel('Partner name').waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'partner-new.png'), fullPage: true });
  console.log('shot partner-new.png');

  await page.goto(`${BASE}/admin/partners/${PARTNER_ID}`, { waitUntil: 'networkidle' });
  await page.getByRole('table', { name: 'Partner users' }).waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'partner-detail.png'), fullPage: true });
  console.log('shot partner-detail.png');

  await page.getByRole('button', { name: /^Edit / }).first().click();
  await page.screenshot({ path: path.join(OUT_DIR, 'partner-user-edit.png'), fullPage: true });
  console.log('shot partner-user-edit.png');

  await browser.close();
})();
