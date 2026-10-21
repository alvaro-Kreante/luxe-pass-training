/**
 * Verificación visual de la invitación de partner (29 sept 2026):
 * LoungeNewPartner.dc.html (Epic 8 · 16), SetPassword.dc.html e
 * InviteExpired.dc.html (Epic 7 · 14–15).
 *
 * Contra Supabase local: un admin de prueba da de alta un lounge con su
 * partner y lo publica (Edge Function `admin-publish-lounge` — necesita
 * `supabase functions serve`), y se abre el enlace de invitación.
 * Uso: node scripts/playwright/scripts/partner/partner-invite-verification.js
 */

const path = require('path');
const { loadEnv } = require('vite');
const { createClient } = require('@supabase/supabase-js');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

const env = loadEnv('development', path.join(__dirname, '../../../..'), '');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error(`Solo contra Supabase local, no ${url}`);

const shot = (name) => path.join(__dirname, `../../screenshots/partner/${name}.png`);
const stamp = Date.now();
const ADMIN = { email: `invite-visual-admin-${stamp}@ensoleil-test.example`, password: 'SupportDesk!24' };
const PARTNER_EMAIL = `camille.duarte-${stamp}@thelarkspur-test.example`;

async function invitePartner() {
  const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: created } = await service.auth.admin.createUser({ ...ADMIN, email_confirm: true });
  await service.from('user_roles').insert({ user_id: created.user.id, role: 'admin' });

  const admin = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await admin.auth.signInWithPassword(ADMIN);
  const { data: loungeId, error } = await admin.rpc('admin_create_lounge', {
    p_lounge: {
      id_base: `the-larkspur-${stamp}`,
      name: 'The Larkspur',
      phone: '+1 212 555 0148',
      email: 'hello@thelarkspur.example',
      website: 'thelarkspur.example',
      address: '27 Bond Street',
      neighborhood: 'NoHo',
      city: 'New York',
      lat: 40.7262,
      lng: -73.9936,
      weekly_hours: ['Closed', '8:00 AM – 9:00 PM', '8:00 AM – 9:00 PM', '8:00 AM – 9:00 PM', '8:00 AM – 9:00 PM', '8:00 AM – 9:00 PM', '9:00 AM – 6:00 PM'],
      closed_weekdays: [0],
      hours: '8 AM – 9 PM',
      amenities: ['wifi'],
      capacity: 24,
      partner: { first_name: 'Camille', last_name: 'Duarte', email: PARTNER_EMAIL, mobile: '+1 917 555 0163' },
    },
  });
  if (error) throw error;
  const published = await admin.functions.invoke('admin-publish-lounge', { body: { loungeId } });
  if (published.error) throw published.error;
  const { data: link } = await service.auth.admin.generateLink({ type: 'invite', email: PARTNER_EMAIL });

  const cleanup = async () => {
    const { data: partner } = await service.from('partners').select('user_id').eq('contact_email', PARTNER_EMAIL).maybeSingle();
    if (partner) await service.auth.admin.deleteUser(partner.user_id);
    await service.auth.admin.deleteUser(created.user.id);
    await service.from('lounges').delete().eq('id', loungeId);
  };
  return { token: link.properties.hashed_token, cleanup };
}

(async () => {
  let cleanup = async () => {};
  let browser;
  try {
    await waitForServer();
    const invite = await invitePartner();
    cleanup = invite.cleanup;
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // SetPassword.dc.html
    await navigateTo(page, `/partner/welcome?token_hash=${invite.token}&type=invite`);
    await page.getByRole('heading', { name: 'Create your password' }).waitFor();
    await takeScreenshot(page, shot('invite-01-set-password'));

    // La foto se previsualiza en el círculo
    await page.getByLabel('Upload photo').setInputFiles(path.join(__dirname, '../../../../public/logo.png'));
    await page.getByRole('img', { name: 'Your photo' }).waitFor();
    await page.getByLabel('Password', { exact: true }).fill('Larkspur2026');
    await page.getByLabel('Confirm password').fill('Larkspur2026');
    await page.waitForTimeout(300);
    await takeScreenshot(page, shot('invite-02-photo-and-password'));

    // InviteExpired.dc.html — el mismo token, ya usado
    await navigateTo(page, `/partner/welcome?token_hash=${invite.token}&type=invite`);
    await page.getByRole('heading', { name: 'This link has expired' }).waitFor();
    await takeScreenshot(page, shot('invite-03-expired'));

    // LoungeNewPartner.dc.html — el admin, en el alta
    await navigateTo(page, '/admin/login');
    await page.getByLabel('Work email').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin/support');
    await navigateTo(page, '/admin/lounges/new');
    await page.getByLabel('First name').fill('Camille');
    await page.getByLabel('Last name').fill('Duarte');
    await page.getByLabel('Work email').fill('camille.duarte@thelarkspur.example');
    await page.getByLabel('Mobile').fill('+1 917 555 0163');
    await takeScreenshot(page, shot('invite-04-admin-new-lounge'));

    console.log('✓ Capturas en scripts/playwright/screenshots/partner/invite-*.png');
  } catch (error) {
    console.error('✗', error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await cleanup();
  }
})();
