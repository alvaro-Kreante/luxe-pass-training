// Verificación visual puntual: "View details" del callout de un pin del
// mapa real debe navegar al perfil del lounge (Epic 3). Bug real reportado
// por el usuario — el clic nunca llegaba a `<Link>` por dos causas en
// city-map.tsx/lounge-callout.tsx, ver sus comentarios. Puerto 3000.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');

for (const line of fs.readFileSync(path.resolve(__dirname, '../../../../.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const BASE = 'http://localhost:3000';

(async () => {
  const email = `view-details-verify-${Date.now()}@ensoleil-test.example`;
  const password = 'EnSoleil!2026';
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 40.75, longitude: -73.98 },
    permissions: ['geolocation'],
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(new RegExp('localhost:3000/($|explore|onboarding)'), { timeout: 10000 });

  await page.goto(`${BASE}/explore`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const allowBtn = page.getByRole('button', { name: 'Allow location access' });
  if (await allowBtn.isVisible().catch(() => false)) {
    await allowBtn.click();
    await page.waitForTimeout(800);
  }

  // Selecciona el lounge igual que un clic en su pin (misma vía: onSelect).
  await page.locator('button:has-text("The Ainsworth")').first().click();
  await page.waitForTimeout(500);

  await page.getByRole('link', { name: 'View details' }).click();
  await page.waitForURL(`${BASE}/lounges/the-ainsworth`, { timeout: 5000 });

  console.log('OK — navegó a', page.url());
  await browser.close();
})();
