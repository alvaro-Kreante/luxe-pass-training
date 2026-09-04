/**
 * Verificación visual de /login
 * Uso: npm run dev, luego en otra terminal: node scripts/playwright/scripts/auth/verify-login.js
 */

const path = require('path');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

(async () => {
  try {
    console.log('⏳ Esperando que el servidor esté listo...');
    await waitForServer();

    const browser = await launchBrowser();
    const page = await browser.newPage();

    console.log('📱 Navegando a /login...');
    await navigateTo(page, '/login');

    // Tomar screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, `../../screenshots/auth/${timestamp}-login.png`);
    await takeScreenshot(page, screenshotPath);
    console.log(`✅ Screenshot guardado: ${screenshotPath}`);

    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
