const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 10.4 — activar, partner activo, suspender partner y lounge (Fase 10 · 5, 6, 7, 11).
// Solo abre los modales: confirmar enviaría invitaciones reales.
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const ACTIVE = process.env.ACTIVE_PARTNER_ID || '4b613c0e-111b-421e-9049-5fe10b08ffb9';
const DRAFT = process.env.DRAFT_PARTNER_ID || '501088a7-7ace-42e8-8c93-339206fd195a';
const LOUNGE = process.env.LOUNGE_ID || 'halcyon-reading-room';
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

  await page.goto(BASE + '/admin/partners/' + DRAFT, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Status:/ }).click();
  await page.getByRole('menuitemradio', { name: /^Active/ }).click();
  await page.getByRole('dialog').waitFor();
  await shot('partner-activate.png');

  await page.goto(BASE + '/admin/partners/' + ACTIVE, { waitUntil: 'networkidle' });
  await page.getByRole('table', { name: 'Partner users' }).waitFor();
  await shot('partner-active.png');
  await page.getByRole('button', { name: /^Status:/ }).click();
  await page.getByRole('menuitemradio', { name: /^Suspended/ }).click();
  await page.getByRole('dialog').waitFor();
  await shot('partner-suspend.png');

  await page.goto(BASE + '/admin/lounges/' + LOUNGE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Status:/ }).click();
  await page.getByRole('menuitemradio', { name: /^Suspended/ }).click();
  await page.getByRole('dialog').waitFor();
  await shot('lounge-suspend.png');

  await browser.close();
})();
