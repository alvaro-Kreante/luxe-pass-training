// Verificación visual puntual de Epic 3 (Lounge Profiles & Details) contra
// Supabase local real. Puerto 3001 porque el 3000 ya estaba ocupado por otro
// dev server en esta sesión. Crea un usuario ya confirmado (API admin, igual
// que src/lib/testing/confirmed-user.ts) e inicia sesión de verdad por la UI
// de /login, porque estas rutas exigen RequireSession.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

// Lee .env.local a mano — no añade `dotenv` como dependencia solo para este
// script puntual.
for (const line of fs.readFileSync(path.resolve(__dirname, '../../../../.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const BASE = 'http://localhost:3001';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../screenshots/lounges');

async function shot(page, name) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${Date.now()}-${name}.png`, fullPage: true });
  console.log(`✅ ${name}`);
}

(async () => {
  const email = `epic3-verify-${Date.now()}@ensoleil-test.example`;
  const password = 'EnSoleil!2026';

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/localhost:3001\/($|explore|onboarding)/, { timeout: 10000 });

  await page.goto(`${BASE}/lounges/the-ainsworth`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1:has-text("The Ainsworth")', { timeout: 10000 });
  await shot(page, 'profile-ainsworth');

  await page.goto(`${BASE}/lounges/celeste-rooftop`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Not available', { timeout: 10000 });
  await shot(page, 'profile-not-available');

  await page.goto(`${BASE}/lounges/the-ainsworth/availability?week=2025-11-24`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('text=Thanksgiving', { timeout: 10000 });
  await shot(page, 'availability-closure');

  await page.goto(`${BASE}/lounges/the-ainsworth/reviews`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Marcus C.', { timeout: 10000 });
  await shot(page, 'reviews-ainsworth');

  await page.goto(`${BASE}/lounges/belmont-terrace/reviews`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=No reviews yet', { timeout: 10000 });
  await shot(page, 'reviews-belmont-empty');

  await browser.close();
  console.log('Listo.');
})();
