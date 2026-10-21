/**
 * Verificación visual puntual del Epic 7 tras conectarlo a Supabase real
 * (22 sept 2026) — login real, dashboard con datos reales (aunque vacíos),
 * sin errores de consola (en particular, que el canal de Supabase Realtime
 * conecte de verdad en un navegador real, a diferencia de jsdom en los
 * tests). Cuenta de partner real: dana.okafor@theainsworth.example / AinsworthFOH!24
 * (sembrada por scripts/seed-partner-account.mjs).
 * Uso: node scripts/playwright/scripts/partner/epic7-backend-real-verification.js
 */

const path = require('path');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

const shot = (name) => path.join(__dirname, `../../screenshots/partner/${name}.png`);

(async () => {
  try {
    await waitForServer();
    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await navigateTo(page, '/partner/login');
    await takeScreenshot(page, shot('real-01-login'));

    await page.getByLabel('Work email').fill('dana.okafor@theainsworth.example');
    await page.getByLabel('Password').fill('AinsworthFOH!24');
    await page.getByRole('button', { name: 'Sign in' }).click();
    // El primer signInWithPassword en frío puede tardar unos segundos.
    await page.waitForURL('**/partner', { timeout: 20000 });
    await page.waitForTimeout(1500); // deja tiempo a fetch + suscripción de Realtime
    await takeScreenshot(page, shot('real-02-today'));

    await navigateTo(page, '/partner/analytics');
    await page.waitForTimeout(800);
    await takeScreenshot(page, shot('real-03-analytics'));

    await navigateTo(page, '/partner/guests');
    await page.waitForTimeout(800);
    await takeScreenshot(page, shot('real-04-guests'));

    await navigateTo(page, '/partner/reports');
    await takeScreenshot(page, shot('real-05-reports'));

    await browser.close();

    console.log(`Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => console.log(' -', e));
    if (consoleErrors.length > 0) process.exitCode = 1;
    else console.log('✅ Sin errores de consola en el flujo real de partner.');
  } catch (error) {
    console.error('❌ Verificación falló:', error);
    process.exitCode = 1;
  }
})();
