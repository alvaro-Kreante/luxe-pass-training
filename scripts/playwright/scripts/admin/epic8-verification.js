const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Verificación visual puntual del Epic 8 (Story 8.1) contra los artboards
 * de docs/design/epic-8-admin-support/. Puerto configurable por env var
 * porque el 3000 ya estaba ocupado por otro proceso durante el desarrollo.
 */
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/admin');

const PAGES = [
  { url: '/admin/support', file: 'support-desk.png' },
  { url: '/admin/members', file: 'member-search-empty.png' },
  { url: '/admin/members?q=duforest', file: 'member-search-results.png' },
  { url: '/admin/members/camille-duforest', file: 'member-profile.png' },
  { url: '/admin/support/CS-4417', file: 'case-detail.png' },
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
