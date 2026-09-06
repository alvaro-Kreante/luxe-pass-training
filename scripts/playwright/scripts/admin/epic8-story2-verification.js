const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');

const PAGES = [
  { url: '/admin/analytics', file: 'analytics.png' },
  { url: '/admin/analytics/demand', file: 'demand.png' },
  { url: '/admin/reports', file: 'export.png' },
  { url: '/admin/reports/scheduled', file: 'scheduled-reports.png' },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const { url, file } of PAGES) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: path.join(OUT_DIR, file) });
    console.log('shot', url, '->', file);
  }

  await browser.close();
})();
