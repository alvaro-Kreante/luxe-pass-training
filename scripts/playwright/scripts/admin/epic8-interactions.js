const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/admin/members/camille-duforest`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Modify booking' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'booking-override-drawer.png') });
  console.log('shot booking-override-drawer.png');

  await page.goto(`${BASE}/admin/support/CS-4417`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Waive and refund/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'refund-modal.png') });
  console.log('shot refund-modal.png');

  await browser.close();
})();
