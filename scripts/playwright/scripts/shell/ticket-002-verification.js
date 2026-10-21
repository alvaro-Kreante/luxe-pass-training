const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Ticket 002 — hover de filas, campana de Admin fuera y logout en los tres shells.
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/shell');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`shot ${name}.png`);
}

async function hoverFirstRow(page, viewName) {
  const view = page.getByRole('button', { name: new RegExp(`^View `) }).first();
  await view.waitFor({ timeout: 15000 });
  const row = view.locator('xpath=ancestor::div[contains(@class,"grid")][1]');
  const cursor = await row.evaluate((el) => getComputedStyle(el).cursor);
  const before = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  await row.hover({ position: { x: 400, y: 20 } });
  await page.waitForTimeout(250);
  const after = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  const chevronCursor = await view.evaluate((el) => getComputedStyle(el).cursor);
  console.log(`${viewName}: row cursor=${cursor} chevron cursor=${chevronCursor} bg ${before} -> ${after}`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // Admin
  let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill('alvaro+admin@kreante.co');
  await page.getByLabel('Password').fill('Pa$$w0rd!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
  await page.goto(`${BASE}/admin/lounges`, { waitUntil: 'networkidle' });
  console.log('admin notifications bell present:', await page.getByRole('button', { name: 'Notifications' }).count());
  await hoverFirstRow(page, 'admin/lounges');
  await shot(page, 'admin-lounges-hover');
  await page.goto(`${BASE}/admin/partners`, { waitUntil: 'networkidle' });
  await hoverFirstRow(page, 'admin/partners');
  await shot(page, 'admin-partners-hover');
  const logout = page.getByRole('button', { name: 'Log out' });
  await logout.hover();
  await shot(page, 'admin-logout-hover');
  await logout.click();
  await page.waitForURL(/\/admin\/login/, { timeout: 15000 });
  await page.goto(`${BASE}/admin/support`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('admin after logout, protected route ->', page.url());
  await page.close();

  // Partner
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/partner/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Work email').fill('dana.okafor@theainsworth.example');
  await page.getByLabel('Password').fill('AinsworthFOH!24');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/partner(?!\/login)/, { timeout: 15000 });
  await page.getByRole('button', { name: 'Log out' }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  if (await page.getByRole('button', { name: /^View / }).count()) {
    await hoverFirstRow(page, 'partner/today');
  } else {
    console.log('partner/today: sin invitados hoy, no hay fila que probar');
  }
  await shot(page, 'partner-today');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL(/\/partner\/login/, { timeout: 15000 });
  await page.goto(`${BASE}/partner`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('partner after logout, protected route ->', page.url());
  await page.close();

  await browser.close();
})();
