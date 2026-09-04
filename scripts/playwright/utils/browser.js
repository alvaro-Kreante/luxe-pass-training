const { chromium } = require('playwright');

const LOCALHOST = 'http://localhost:3000';
const RETRY_ATTEMPTS = 10;
const RETRY_DELAY = 2000;

async function waitForServer() {
  let retries = RETRY_ATTEMPTS;
  while (retries > 0) {
    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(LOCALHOST, { waitUntil: 'networkidle', timeout: 5000 });
      await browser.close();
      console.log('✅ Server está listo');
      return true;
    } catch (e) {
      retries--;
      if (retries === 0) throw new Error('Servidor no respondió después de varios intentos');
      console.log(`⏳ Esperando servidor... (${retries} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function launchBrowser() {
  return await chromium.launch({ headless: true });
}

async function navigateTo(page, path) {
  return await page.goto(`${LOCALHOST}${path}`, { waitUntil: 'networkidle', timeout: 10000 });
}

async function takeScreenshot(page, filename) {
  return await page.screenshot({ path: filename, fullPage: true });
}

module.exports = {
  LOCALHOST,
  waitForServer,
  launchBrowser,
  navigateTo,
  takeScreenshot,
};
