/**
 * Verificación visual del Epic 6 — Member Experience & Notifications.
 * Uso: node scripts/playwright/scripts/account/epic6-verification.js
 */

const path = require('path');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

const shot = (name) => path.join(__dirname, `../../screenshots/account/${Date.now()}-${name}.png`);

(async () => {
  try {
    await waitForServer();
    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // My bookings — Upcoming (Story 6.1)
    await navigateTo(page, '/my-pass');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('my-pass-upcoming'));

    // Cancel modal — free cancellation
    await page.getByRole('heading', { name: 'The Ainsworth', level: 2 }).first().waitFor();
    const rows = await page.locator('li').all();
    for (const row of rows) {
      const text = await row.innerText();
      if (text.includes('free until')) {
        await row.getByRole('button', { name: 'Cancel' }).click();
        break;
      }
    }
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('my-pass-cancel-free'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Cancel modal — fee
    const rows2 = await page.locator('li').all();
    for (const row of rows2) {
      const text = await row.innerText();
      if (text.includes('Bergdorf Lounge')) {
        await row.getByRole('button', { name: 'Cancel' }).click();
        break;
      }
    }
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('my-pass-cancel-fee'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Past tab
    await page.getByRole('tab', { name: /past/i }).click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('my-pass-history'));

    // Notification bell panel (pattern 14)
    await navigateTo(page, '/my-pass');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /notifications/i }).click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('notification-bell-panel'));

    // Notifications center
    await navigateTo(page, '/notifications');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('notifications-center'));

    // Profile details
    await navigateTo(page, '/profile');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('profile-details'));

    // Preferences
    await navigateTo(page, '/profile/preferences');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('profile-preferences'));

    // Notification settings
    await navigateTo(page, '/profile/notifications');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('profile-notification-settings'));

    // Privacy and data
    await navigateTo(page, '/profile/privacy');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('profile-privacy'));

    // Delete account modal
    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('profile-delete-account-modal'));

    await browser.close();
    console.log('✅ Screenshots del Epic 6 generados en scripts/playwright/screenshots/account/');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
