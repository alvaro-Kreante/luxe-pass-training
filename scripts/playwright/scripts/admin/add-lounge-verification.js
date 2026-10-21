const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Story 8.3 — alta de un lounge (artboards 14 y 15 de Epic 8).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');
const FIXTURE = path.resolve(__dirname, '../../../../public/logo.png');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') console.log('console', msg.type(), msg.text().slice(0, 300)); });

  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('alvaro+admin@kreante.co');
  await page.getByLabel('Password').fill('Pa$$w0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });

  await page.goto(`${BASE}/admin/lounges/new`, { waitUntil: 'networkidle' });
  await page.getByLabel('Lounge name').fill('The Larkspur');
  await page.getByLabel('Phone').fill('+1 212 555 0148');
  await page.locator('#lounge-email').fill('hello@thelarkspur.example');
  await page.getByRole('combobox', { name: 'Address' }).pressSequentially('27 Bond Street New', { delay: 30 }); // ('27 Bond Street New York');
  await page.getByRole('listbox', { name: 'Address suggestions' }).waitFor({ timeout: 10000 }).catch(() => console.log('no suggestions'));
  await page.screenshot({ path: path.join(OUT_DIR, 'add-lounge-suggestions.png') });
  console.log('shot add-lounge-suggestions.png');
  if (await page.getByRole('option').count()) {
    await page.getByRole('option').first().click();
    await page.waitForTimeout(2500);
    await page.getByRole('combobox', { name: 'Address' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT_DIR, 'add-lounge-location.png') });
    console.log('shot add-lounge-location.png');
  }
  await page.getByRole('switch', { name: 'Mon open' }).click();
  await page.getByRole('button', { name: 'Copy Monday to every day' }).click();
  await page.getByLabel('Add lounge photos').setInputFiles([FIXTURE]);
  await page.getByRole('button', { name: /^Edit photo/ }).first().waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'add-lounge.png'), fullPage: true });
  console.log('shot add-lounge.png');

  await page.getByRole('button', { name: /^Edit photo/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'add-lounge-photo-dialog.png') });
  console.log('shot add-lounge-photo-dialog.png');

  await browser.close();
})();
