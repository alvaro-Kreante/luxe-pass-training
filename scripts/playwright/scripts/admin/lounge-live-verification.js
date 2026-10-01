/**
 * Verificación visual del detalle de lounge del admin (29 sept 2026):
 * LoungeLive (17), LoungeEditConfirm (18), LoungeDraftPartners (19),
 * PartnerAdd (20), PartnerSuspend (21) y PartnerDelete (22) de Epic 8.
 *
 * Contra Supabase local: un lounge live con una foto y dos partners (uno
 * activo, uno invitado) creado con la service role; se borra al terminar.
 * Uso: node scripts/playwright/scripts/admin/lounge-live-verification.js
 */

const path = require('path');
const { loadEnv } = require('vite');
const { createClient } = require('@supabase/supabase-js');
const { launchBrowser, takeScreenshot, waitForServer } = require('../../utils/browser');

// `navigateTo` espera `networkidle`, que el mapa de Google no alcanza nunca.
const navigateTo = (page, route) => page.goto(`http://localhost:3000${route}`, { waitUntil: 'load', timeout: 60000 });

const env = loadEnv('development', path.join(__dirname, '../../../..'), '');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error(`Solo contra Supabase local, no ${url}`);

const shot = (name) => path.join(__dirname, `../../screenshots/admin/${name}.png`);
const stamp = Date.now();
const ADMIN = { email: `lounge-visual-admin-${stamp}@ensoleil-test.com`, password: 'SupportDesk!24' };
const LOUNGE_ID = `test-lounge-visual-${stamp}`;
const PHOTO = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

async function seed(service) {
  const users = [];
  const { data: admin } = await service.auth.admin.createUser({ ...ADMIN, email_confirm: true });
  users.push(admin.user.id);
  await service.from('user_roles').insert({ user_id: admin.user.id, role: 'admin' });

  await service.from('lounges').insert({
    id: LOUNGE_ID,
    name: 'The Larkspur',
    neighborhood: 'NoHo',
    city: 'New York',
    city_id: 'new-york',
    address: '27 Bond Street',
    phone: '+1 212 555 0148',
    email: 'hello@thelarkspur.com',
    website: 'thelarkspur.com',
    lat: 40.7262,
    lng: -73.9936,
    hours: '8 AM – 9 PM',
    bands: ['morning', 'afternoon', 'evening'],
    amenities: ['wifi', 'co-working', 'lounge'],
    weekly_hours: ['Closed', '8 AM – 9 PM', '8 AM – 9 PM', '8 AM – 9 PM', '8 AM – 9 PM', '8 AM – 9 PM', '9 AM – 6 PM'],
    booking_restrictions: ['Members only', 'Max 2 guests'],
    capacity: 24,
  });
  await service.from('lounge_images').insert({ lounge_id: LOUNGE_ID, url: PHOTO, caption: 'Main room', position: 0 });

  for (const [first, last, state] of [['Camille', 'Duarte', 'active'], ['Julian', 'Mercer', 'invited']]) {
    const email = `${first.toLowerCase()}-${stamp}@thelarkspur-test.com`;
    const { data } =
      state === 'active'
        ? await service.auth.admin.createUser({ email, password: 'Larkspur2026', email_confirm: true })
        : await service.auth.admin.generateLink({ type: 'invite', email });
    users.push(data.user.id);
    await service.from('user_roles').insert({ user_id: data.user.id, role: 'partner' });
    const { data: partner } = await service
      .from('partners')
      .insert({ user_id: data.user.id, business_name: 'The Larkspur', contact_email: email, first_name: first, last_name: last })
      .select('id')
      .single();
    await service.from('partner_lounges').insert({ partner_id: partner.id, lounge_id: LOUNGE_ID });
    await service.from('lounge_partner_invites').insert({ lounge_id: LOUNGE_ID, first_name: first, last_name: last, email, partner_id: partner.id });
  }

  return async () => {
    for (const id of users) await service.auth.admin.deleteUser(id);
    await service.from('lounges').delete().eq('id', LOUNGE_ID);
  };
}

(async () => {
  const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);
  let cleanup = async () => {};
  let browser;
  try {
    await waitForServer();
    cleanup = await seed(service);
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', (message) => message.type() === 'error' && console.log('console error:', message.text().slice(0, 300)));
    page.on('pageerror', (error) => console.log('page error:', error.message.slice(0, 300)));

    await navigateTo(page, '/admin/login');
    await page.getByLabel('Work email').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin/support', { timeout: 120000 });

    // 17 — live, bloqueado
    await navigateTo(page, `/admin/lounges/${LOUNGE_ID}`);
    await page.getByRole('button', { name: 'Edit lounge' }).waitFor();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, shot('lounge-17-live'));

    // 20 — añadir partner
    await page.getByRole('button', { name: 'Add partner' }).click();
    await page.getByRole('dialog').getByLabel('First name').fill('Rafael');
    await page.getByRole('dialog').getByLabel('Last name').fill('Ortiz');
    await page.getByRole('dialog').getByLabel('Work email').fill('rafael.ortiz@thelarkspur.com');
    await takeScreenshot(page, shot('lounge-20-add-partner'));
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 21 — suspender
    await page.getByRole('button', { name: 'Suspend Julian Mercer' }).click();
    await page.getByRole('dialog').waitFor();
    await takeScreenshot(page, shot('lounge-21-suspend'));
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 22 — eliminar
    await page.getByRole('button', { name: 'Delete Julian Mercer' }).click();
    await page.getByRole('dialog').waitFor();
    await takeScreenshot(page, shot('lounge-22-delete'));
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 18 — pasar a draft
    await page.getByRole('button', { name: 'Edit lounge' }).click();
    await page.getByRole('dialog').waitFor();
    await takeScreenshot(page, shot('lounge-18-edit-confirm'));
    await page.getByRole('button', { name: 'Move to draft and edit' }).click();

    // 19 — borrador editable, con los partners
    await page.getByRole('button', { name: 'Publish lounge' }).waitFor();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, shot('lounge-19-draft'));

    console.log('✓ Capturas en scripts/playwright/screenshots/admin/lounge-*.png');
  } catch (error) {
    console.error('✗', error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await cleanup();
  }
})();
