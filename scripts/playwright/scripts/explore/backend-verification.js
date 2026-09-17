const { chromium } = require('playwright');

/**
 * Story 2.1 — verificación puntual de que /explore exige sesión real
 * (RequireSession) tras conectar el catálogo a Supabase.
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/explore', { waitUntil: 'networkidle', timeout: 10000 });
  console.log('URL tras visitar /explore sin sesión:', page.url());
  await page.screenshot({
    path: 'scripts/playwright/screenshots/explore/backend-verification-unauth.png',
    fullPage: true,
  });
  await browser.close();
})();
