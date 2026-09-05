/**
 * Verificación visual del Epic 7 — Partner Dashboard (Stories 7.1, 7.2, 7.3).
 * Uso: node scripts/playwright/scripts/partner/epic7-verification.js
 */

const path = require('path');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

const shot = (name) => path.join(__dirname, `../../screenshots/partner/${name}.png`);

(async () => {
  try {
    await waitForServer();
    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Login.dc.html
    await navigateTo(page, '/partner/login');
    await takeScreenshot(page, shot('01-login'));

    // Main.dc.html — Today's guests
    await navigateTo(page, '/partner');
    await takeScreenshot(page, shot('02-today'));

    // GuestDetail.dc.html — abrir la ficha de un invitado pendiente
    await page.getByRole('button', { name: 'View details for Idris Fontaine' }).click();
    await page.waitForTimeout(200);
    await takeScreenshot(page, shot('03-guest-detail'));

    // NoShow.dc.html
    await page.getByRole('button', { name: 'No-show' }).click();
    await page.waitForTimeout(200);
    await takeScreenshot(page, shot('04-no-show'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // Export.dc.html
    await page.getByRole('button', { name: 'Export CSV' }).click();
    await page.waitForTimeout(200);
    await takeScreenshot(page, shot('05-export'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // LiveUpdate.dc.html — esperar la reserva en vivo (Naomi Feldstein)
    await navigateTo(page, '/partner');
    await page.getByText('15 expected today').waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('06-live-update-toast'));
    await page.getByRole('button', { name: /unread/ }).click();
    await page.waitForTimeout(200);
    await takeScreenshot(page, shot('07-activity-panel'));

    // EmailDigest.dc.html
    await navigateTo(page, '/partner/emails/digest');
    await takeScreenshot(page, shot('08-email-digest'));

    // EmailNewBooking.dc.html
    await navigateTo(page, '/partner/emails/new-booking');
    await takeScreenshot(page, shot('09-email-new-booking'));

    // EmailCancellation.dc.html
    await navigateTo(page, '/partner/emails/cancellation');
    await takeScreenshot(page, shot('10-email-cancellation'));

    // Analytics.dc.html
    await navigateTo(page, '/partner/analytics');
    await takeScreenshot(page, shot('11-analytics'));

    // RepeatGuests.dc.html
    await navigateTo(page, '/partner/guests');
    await takeScreenshot(page, shot('12-repeat-guests'));

    // Reports.dc.html
    await navigateTo(page, '/partner/reports');
    await takeScreenshot(page, shot('13-reports'));

    await browser.close();
    console.log('✅ Screenshots del Epic 7 guardados en scripts/playwright/screenshots/partner/');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
