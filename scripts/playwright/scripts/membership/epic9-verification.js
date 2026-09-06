/**
 * Verificación visual puntual del Epic 9 (Membership & Referrals).
 * Uso: node scripts/playwright/scripts/membership/epic9-verification.js
 */
const path = require('path');
const { chromium } = require('playwright');

const LOCALHOST = 'http://localhost:3001';
const OUT = (name) => path.join(__dirname, `../../screenshots/membership/${name}.png`);

async function shot(page, route, filename) {
  await page.goto(`${LOCALHOST}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: OUT(filename), fullPage: true });
  console.log(`✅ ${filename} <- ${route}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await shot(page, '/profile/membership', '01-main-annual');
    await shot(page, '/profile/membership?plan=monthly', '02-monthly-plan');
    await shot(page, '/profile/membership/plans', '03-plans-annual-current');
    await shot(page, '/profile/membership/plans?plan=monthly', '04-plans-monthly-current');
    await shot(page, '/profile/membership/referrals', '05-referrals-default');
    await shot(page, '/profile/membership/referrals?state=credited', '06-referrals-credited');

    // Auto-renew modal (Alexandra)
    await page.goto(`${LOCALHOST}/profile/membership`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Manage renewal' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT('07-auto-renew-modal'), fullPage: true });
    console.log('✅ 07-auto-renew-modal');

    // Upgrade confirm modal (Naomi)
    await page.goto(`${LOCALHOST}/profile/membership?plan=monthly`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Switch to annual' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT('08-upgrade-confirm-modal'), fullPage: true });
    console.log('✅ 08-upgrade-confirm-modal');

    // Share modal
    await page.goto(`${LOCALHOST}/profile/membership/referrals`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Share your code' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT('09-share-modal'), fullPage: true });
    console.log('✅ 09-share-modal');

    // Terms modal
    await page.goto(`${LOCALHOST}/profile/membership/referrals`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Referral terms' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT('10-terms-modal'), fullPage: true });
    console.log('✅ 10-terms-modal');

    // Bell panel with the two new notifications (credited state)
    await page.goto(`${LOCALHOST}/profile/membership/referrals?state=credited`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /notification/i }).first().click().catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: OUT('11-referrals-credited-bell'), fullPage: true });
    console.log('✅ 11-referrals-credited-bell');

    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
