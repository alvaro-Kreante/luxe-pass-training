const { chromium } = require('playwright');

/**
 * Story 2.1/2.2/2.3 — verificación puntual de /explore con sesión real:
 * confirma que el mapa, el panel de resultados y el catálogo real de
 * Supabase se ven bien, no solo que los tests de jsdom pasan.
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['geolocation'],
    geolocation: { latitude: 40.7595, longitude: -73.97 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle', timeout: 10000 });
  await page.getByLabel('Email').fill('playwright-explore@ensoleil-test.example');
  await page.getByRole('textbox', { name: 'Password' }).fill('EnSoleil!2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/', { timeout: 10000 });

  await page.goto('http://localhost:3001/explore', { waitUntil: 'networkidle', timeout: 10000 });
  await page.getByRole('button', { name: 'Allow location access' }).click();
  await page
    .getByRole('heading', { name: 'Let LuxePass use your location' })
    .waitFor({ state: 'hidden', timeout: 10000 });

  await page.screenshot({
    path: 'scripts/playwright/screenshots/explore/backend-verification-map.png',
    fullPage: true,
  });

  await page.getByRole('button', { name: 'List' }).click();
  await page.getByRole('heading', { level: 3 }).first().waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'scripts/playwright/screenshots/explore/backend-verification-list.png',
    fullPage: true,
  });

  console.log('OK — capturas guardadas');
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
