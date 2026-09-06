const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');

const PAGES = [
  { url: '/admin/lounges', file: 'lounges.png' },
  { url: '/admin/lounges/the-vestry', file: 'lounge-edit.png' },
  { url: '/admin/lounges/approvals', file: 'approvals.png' },
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

  // Selección múltiple para ver la barra de acción masiva.
  await page.goto(`${BASE}/admin/lounges`, { waitUntil: 'networkidle' });
  const checkboxes = await page.getByRole('checkbox').all();
  await checkboxes[0].click({ force: true });
  await checkboxes[1].click({ force: true });
  await checkboxes[2].click({ force: true });
  await page.screenshot({ path: path.join(OUT_DIR, 'lounges-bulk-selected.png') });
  console.log('shot bulk selection -> lounges-bulk-selected.png');

  await browser.close();
})();
