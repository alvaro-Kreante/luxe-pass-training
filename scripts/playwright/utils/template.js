/**
 * Plantilla para scripts de Playwright
 * Copiar este archivo a scripts/<feature>/<nombre>.js y reemplazar TODO
 *
 * Uso:
 *   node scripts/playwright/scripts/<feature>/<nombre>.js
 */

const path = require('path');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../utils/browser');

(async () => {
  try {
    // Esperar a que el servidor esté listo
    await waitForServer();

    const browser = await launchBrowser();
    const page = await browser.newPage();

    // TODO: Reemplazar con la ruta que quieras probar
    const route = '/login';
    await navigateTo(page, route);

    // TODO: Agregar interacciones si es necesario
    // await page.click('button[type="submit"]');
    // await page.waitForTimeout(500);

    // Guardar screenshot
    const screenshotPath = path.join(__dirname, `../../screenshots/<feature>/${Date.now()}-<nombre>.png`);
    await takeScreenshot(page, screenshotPath);
    console.log(`✅ Screenshot guardado: ${screenshotPath}`);

    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
