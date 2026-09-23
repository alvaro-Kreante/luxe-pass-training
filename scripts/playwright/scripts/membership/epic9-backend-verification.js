/**
 * Verificación visual de Epic 9 con backend real (Supabase local + Stripe
 * modo test): estados sin artboard propio — membresía inactiva, elección de
 * plan ("Choose …") y el modal de alta — más la vista con plan activo.
 * Crea un miembro nuevo con el service role (lee `.env.local`) e inicia
 * sesión por la UI de /login.
 *
 * Uso: node scripts/playwright/scripts/membership/epic9-backend-verification.js
 */

const fs = require('fs');
const path = require('path');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

const shot = (name) => path.join(__dirname, `../../screenshots/membership/${Date.now()}-${name}.png`);

function readEnv() {
  const text = fs.readFileSync(path.join(__dirname, '../../../../.env.local'), 'utf8');
  return Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
  );
}

async function adminFetch(env, pathname, body, method = 'POST') {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${pathname}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${pathname}: ${res.status} ${await res.text()}`);
  return res.json();
}

(async () => {
  try {
    await waitForServer();
    const env = readEnv();
    const email = `epic9-visual-${Date.now()}@ensoleil-test.com`;
    const password = 'EnSoleil!2026';

    const user = await adminFetch(env, '/auth/v1/admin/users', { email, password, email_confirm: true });
    await adminFetch(env, '/rest/v1/profiles', {
      id: user.id,
      full_name: 'Naomi Feldstein',
      phone: '+15555550100',
      city: 'New York',
      industry: 'Hospitality',
      birth_day: 14,
      birth_month: 9,
      terms_accepted_at: new Date().toISOString(),
    });

    const browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    global.__page = page;
    page.on('pageerror', (error) => console.error('pageerror:', error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('console:', msg.text().slice(0, 300));
    });

    await navigateTo(page, '/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

    // Story 9.1 — membresía inactiva (sin artboard propio)
    await navigateTo(page, '/profile/membership');
    await page.getByText('Inactive').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    await takeScreenshot(page, shot('membership-inactive'));

    // Elegir plan — Plans.dc.html sin "Your plan"
    await navigateTo(page, '/profile/membership/plans');
    await page.getByRole('button', { name: 'Choose annual' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('plans-choose'));

    // Modal de alta (Upgrade.dc.html sin prorrateo) — sin tarjeta guardada monta el Payment Element
    await page.getByRole('button', { name: 'Choose annual' }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(4000);
    await takeScreenshot(page, shot('plans-join-modal'));
    await page.keyboard.press('Escape');

    // Plan mensual activo (sembrado con el service role) — MonthlyPlan.dc.html con datos reales
    const now = new Date();
    const start = new Date(now.getTime() - 8 * 86400000);
    await adminFetch(env, '/rest/v1/memberships', {
      member_id: user.id,
      plan: 'monthly',
      status: 'active',
      started_at: new Date('2026-07-04T00:00:00Z').toISOString(),
      current_period_start: start.toISOString(),
      current_period_end: new Date(start.getTime() + 30 * 86400000).toISOString(),
      auto_renew: true,
    });
    await navigateTo(page, '/profile/membership');
    await page.getByRole('button', { name: 'Switch to annual' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(400);
    await takeScreenshot(page, shot('membership-monthly'));

    await page.getByRole('button', { name: 'Switch to annual' }).click();
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(4000);
    await takeScreenshot(page, shot('upgrade-modal'));
    await page.keyboard.press('Escape');

    // Anual → mensual programado al final del término (ScheduleMonthlyModal, sin artboard propio)
    await adminFetch(env, '/rest/v1/memberships', {
      member_id: user.id,
      plan: 'annual',
      status: 'active',
      started_at: new Date('2025-11-03T00:00:00Z').toISOString(),
      current_period_start: new Date('2025-11-03T00:00:00Z').toISOString(),
      current_period_end: new Date('2026-11-03T00:00:00Z').toISOString(),
      auto_renew: true,
      pending_plan: null,
    });
    await navigateTo(page, '/profile/membership/plans');
    await page.getByRole('button', { name: 'Switch to monthly' }).click({ timeout: 15000 });
    await page.getByRole('dialog').waitFor();
    await page.waitForTimeout(400);
    await takeScreenshot(page, shot('schedule-monthly-modal'));
    await page.getByRole('button', { name: /^Switch to monthly on / }).click();
    await page.getByRole('button', { name: 'Switch scheduled' }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('plans-monthly-scheduled'));
    await navigateTo(page, '/profile/membership');
    await page.getByText(/Switching to monthly on/).waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('membership-switching-to-monthly'));

    // Story 9.2 — referidos reales (vacío)
    await navigateTo(page, '/profile/membership/referrals');
    await page.getByText('No one has joined with your code yet.').waitFor({ timeout: 15000 });
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('referrals-empty'));

    await browser.close();
    console.log('✓ Epic 9 backend verification complete');
  } catch (error) {
    if (global.__page) await takeScreenshot(global.__page, shot('error'));
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
})();
