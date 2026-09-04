/**
 * Verificación visual puntual del Epic 5 (QR Code & Check-in).
 * Uso: node scripts/playwright/scripts/passes/epic5-verification.js
 */

const path = require('path');
const { launchBrowser, takeScreenshot, waitForServer, LOCALHOST } = require('../../utils/browser');

async function navigateTo(page, route) {
  return page.goto(`${LOCALHOST}${route}`, { waitUntil: 'load', timeout: 15000 });
}

const SCREENS = [
  { route: '/my-pass', name: 'my-pass-upcoming' },
  { route: '/my-pass/LP-842193', name: 'pass-upcoming' },
  { route: '/my-pass/LP-842193?state=today', name: 'pass-today' },
  { route: '/my-pass/LP-842193?state=checked-in', name: 'pass-checked-in' },
  { route: '/my-pass/LP-842193?state=expired', name: 'pass-expired' },
  { route: '/my-pass/LP-842193/reminder', name: 'reminder-email' },
  { route: '/reception', name: 'reception-valid' },
];

(async () => {
  try {
    await waitForServer();

    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    for (const screen of SCREENS) {
      await navigateTo(page, screen.route);
      const screenshotPath = path.join(__dirname, `../../screenshots/passes/${Date.now()}-${screen.name}.png`);
      await takeScreenshot(page, screenshotPath);
      console.log(`✅ ${screen.route} → ${screenshotPath}`);
    }

    // Past tab (NoShow.dc.html)
    await navigateTo(page, '/my-pass');
    await page.getByRole('tab', { name: /past/i }).click();
    await page.waitForTimeout(200);
    await takeScreenshot(page, path.join(__dirname, `../../screenshots/passes/${Date.now()}-my-pass-past.png`));
    console.log('✅ /my-pass (Past tab)');

    // Reception error state
    await navigateTo(page, '/reception');
    await page.fill('#reception-lookup', 'LP-842917');
    await page.click('role=button[name=/look up/i]');
    await page.waitForTimeout(200);
    await takeScreenshot(page, path.join(__dirname, `../../screenshots/passes/${Date.now()}-reception-error.png`));
    console.log('✅ /reception (error)');

    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
