const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Epic 10 — revisión visual del flujo completo, de punta a punta en local:
// el admin crea un partner con dos usuarios, edita, cambia el representante,
// lo activa, le asigna un lounge y lo publica; la usuaria crea su contraseña
// desde el enlace y entra al dashboard; el admin suspende y reactiva el
// partner; un miembro ve el partner en la ficha. Emails `*-test.com` (Brevo
// no envía nada en local) y al final se deja todo como estaba.
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const LOUNGE = process.env.LOUNGE_ID || 'passaic-house';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/epic10-flow');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../../../../.env.local'), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const stamp = Date.now();
const PARTNER = `Riverside Spa ${stamp}`;
const LEILA = `leila-${stamp}@riverside-test.com`;
const OMAR = `omar-${stamp}@riverside-test.com`;
const MEMBER = `flow-member-${stamp}@ensoleil-test.com`;
let step = 0;

async function shot(page, name) {
  step += 1;
  const file = `${String(step).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
  console.log('shot', file);
}

async function chooseStatus(page, status) {
  await page.getByRole('button', { name: /^Status:/ }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(`^${status}`) }).click();
}

async function login(page, url, email, password) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
}

// Los lounges sembrados traen 6 fotos y guardar un borrador exige 3 como
// mucho: si publicar falla por eso, se anota y se publica por base de datos
// para poder seguir revisando el resto del flujo.
const findings = [];
async function publishOrFallback(page, label) {
  await page.getByRole('button', { name: 'Publish lounge' }).click();
  const live = page.getByRole('dialog', { name: 'The lounge is live' });
  // El anunciador de rutas de Next.js también es role="alert": solo el del formulario.
  const alert = page.getByRole('alert').filter({ hasText: /\S/ }).filter({ hasNotText: /^Passaic|^Lounges/ });
  await Promise.race([live.waitFor({ timeout: 90000 }), alert.waitFor({ timeout: 90000 })]).catch(() => undefined);
  if (await live.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Done' }).click();
    return;
  }
  const message = (await alert.textContent().catch(() => '')) || 'sin aviso';
  findings.push(`${label}: publicar falló con "${message.trim()}"`);
  await shot(page, `${label}-fallo`);
  await service.from('lounges').update({ content_status: 'live' }).eq('id', LOUNGE);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { data: before } = await service.from('lounges').select('content_status, partner_id').eq('id', LOUNGE).single();
  const browser = await chromium.launch({ headless: true });
  const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  admin.on('pageerror', (e) => errors.push(`admin: ${e.message}`));
  let partnerId = null;
  let memberId = null;

  try {
    // 1. Alta del partner con su primer usuario
    await login(admin, '/admin/login', 'alvaro+admin@kreante.co', 'Pa$$w0rd!');
    await admin.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
    await admin.goto(BASE + '/admin/partners', { waitUntil: 'networkidle' });
    await admin.getByRole('link', { name: /Add partner/ }).click();
    await admin.getByLabel('Partner name').fill(PARTNER);
    await admin.getByLabel('Contact email').fill('hello@riverside-test.com');
    await admin.getByLabel('Street address').fill('40 River Road');
    await admin.getByLabel('City').fill('Newark');
    await admin.getByLabel('Country').fill('United States');
    await admin.getByLabel('First name').fill('Leila');
    await admin.getByLabel('Last name').fill('Haddad');
    await admin.getByLabel('Work email').fill(LEILA);
    await shot(admin, 'alta-partner');
    await admin.getByRole('button', { name: 'Save draft' }).click();
    await admin.waitForURL(/\/admin\/partners\/[0-9a-f-]{36}$/, { timeout: 15000 });
    partnerId = admin.url().split('/').pop();
    await admin.getByRole('table', { name: 'Partner users' }).waitFor();
    await shot(admin, 'detalle-draft');

    // 2. Segundo usuario, lápiz, representante y aviso al borrar al representante
    await admin.getByRole('button', { name: 'Add user' }).click();
    await admin.getByLabel('First name').fill('Omar');
    await admin.getByLabel('Last name').fill('Saleh');
    await admin.getByLabel('Work email').fill(OMAR);
    await admin.getByRole('button', { name: 'Save user' }).click();
    await admin.getByRole('row', { name: /Omar Saleh/ }).waitFor();
    await admin.getByRole('button', { name: 'Edit Omar Saleh' }).click();
    await admin.getByLabel('Mobile').fill('+1 973 555 0144');
    await shot(admin, 'editar-usuario');
    await admin.getByRole('button', { name: 'Save changes to Omar' }).click();
    await admin.getByRole('button', { name: 'Delete Leila Haddad' }).click();
    await admin.getByText(/Leila Haddad is the representative/).waitFor();
    await shot(admin, 'aviso-representante');
    await admin.getByRole('button', { name: 'Make Omar Saleh the representative' }).click();
    await admin.waitForTimeout(800);
    await admin.getByRole('button', { name: 'Make Leila Haddad the representative' }).click();
    await admin.waitForTimeout(800);

    // 3. Activar
    await admin.getByRole('button', { name: 'Status: Draft' }).click();
    await shot(admin, 'selector-status-draft');
    await admin.getByRole('menuitemradio', { name: /^Active/ }).click();
    await admin.getByRole('dialog', { name: 'Activate this partner?' }).waitFor();
    await shot(admin, 'activar-modal');
    await admin.getByRole('button', { name: 'Activate and invite' }).click();
    await admin.getByRole('button', { name: 'Status: Active' }).waitFor({ timeout: 30000 });
    await shot(admin, 'partner-activo');

    // 4. Asignar el lounge: pasarlo a draft, elegir partner, publicar
    await admin.goto(BASE + '/admin/lounges/' + LOUNGE, { waitUntil: 'domcontentloaded' });
    await admin.getByRole('button', { name: 'Edit lounge' }).click();
    await admin.getByRole('button', { name: 'Move to draft and edit' }).click();
    const picker = admin.getByRole('combobox', { name: 'Who runs this lounge' });
    await picker.waitFor({ timeout: 20000 });
    await picker.fill('Riverside');
    await admin.getByRole('option', { name: new RegExp(PARTNER) }).click();
    await picker.scrollIntoViewIfNeeded().catch(() => undefined);
    await shot(admin, 'lounge-con-partner');
    await publishOrFallback(admin, 'publicar-con-partner');
    await admin.goto(BASE + '/admin/lounges/' + LOUNGE, { waitUntil: 'domcontentloaded' });
    await admin.getByRole('region', { name: 'Partner' }).waitFor({ timeout: 20000 });
    await shot(admin, 'lounge-live-tarjeta-partner');

    // 5. La usuaria abre su invitación y crea la contraseña
    const { data: link } = await service.auth.admin.generateLink({ type: 'invite', email: LEILA });
    const partnerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const partner = await partnerContext.newPage();
    partner.on('pageerror', (e) => errors.push(`partner: ${e.message}`));
    await partner.goto(`${BASE}/partner/welcome?token_hash=${link.properties.hashed_token}&type=invite`, { waitUntil: 'networkidle' });
    await partner.getByRole('heading', { name: 'Create your password' }).waitFor({ timeout: 20000 });
    await partner.locator('#partner-password').fill('Riverside2026');
    await partner.locator('#partner-password-confirm').fill('Riverside2026');
    await shot(partner, 'bienvenida-partner');
    await partner.getByRole('button', { name: 'Create account' }).click();
    await partner.waitForURL(/\/partner(\/login)?$/, { timeout: 20000 });
    if (partner.url().endsWith('/partner/login')) {
      await login(partner, '/partner/login', LEILA, 'Riverside2026');
      await partner.waitForURL(/\/partner$/, { timeout: 15000 });
    }

    // 6. Dashboard del partner con su lounge
    await partner.getByRole('button', { name: /^Lounge:/ }).waitFor({ timeout: 20000 });
    await partner.getByRole('button', { name: /^Lounge:/ }).click();
    await partner.getByRole('menu', { name: 'Lounges' }).waitFor();
    await shot(partner, 'dashboard-partner');
    await partner.keyboard.press('Escape');

    // 7. Suspender y reactivar el partner
    await admin.goto(BASE + '/admin/partners/' + partnerId, { waitUntil: 'networkidle' });
    await chooseStatus(admin, 'Suspended');
    await admin.getByRole('dialog', { name: 'Suspend this partner?' }).getByRole('button', { name: 'Suspend partner' }).click();
    await admin.getByRole('button', { name: 'Status: Suspended' }).waitFor({ timeout: 30000 });
    await shot(admin, 'partner-suspendido');
    await partner.reload({ waitUntil: 'networkidle' });
    await partner.waitForTimeout(1500);
    await shot(partner, 'partner-tras-suspension');
    await chooseStatus(admin, 'Active');
    await admin.getByRole('button', { name: 'Status: Active' }).waitFor({ timeout: 30000 });
    await shot(admin, 'partner-reactivado');

    // El lounge vuelve en draft: se publica otra vez para la vista de miembro
    await admin.goto(BASE + '/admin/lounges/' + LOUNGE, { waitUntil: 'domcontentloaded' });
    await admin.getByRole('button', { name: 'Publish lounge' }).waitFor({ timeout: 20000 });
    await shot(admin, 'lounge-en-draft-tras-reactivar');
    await publishOrFallback(admin, 'republicar');

    // 8. El miembro ve el partner en la ficha
    const { data: created } = await service.auth.admin.createUser({ email: MEMBER, password: 'EnSoleil!2026', email_confirm: true });
    memberId = created.user.id;
    await service.from('profiles').insert({ id: memberId, full_name: 'Flow Member', phone: '+15555550100', city: 'New York', industry: 'Testing', terms_accepted_at: new Date().toISOString() });
    const memberContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const member = await memberContext.newPage();
    await login(member, '/login', MEMBER, 'EnSoleil!2026');
    await member.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
    await member.goto(BASE + '/lounges/' + LOUNGE, { waitUntil: 'domcontentloaded' });
    await member.getByText(PARTNER).first().waitFor({ timeout: 20000 });
    await shot(member, 'ficha-miembro');
  } catch (error) {
    await shot(admin, 'fallo-admin').catch(() => undefined);
    console.error('FALLO:', error.message.split('\n')[0]);
    process.exitCode = 1;
  } finally {
    await browser.close();
    // Dejar todo como estaba
    await service.from('lounges').update({ partner_id: before.partner_id, content_status: before.content_status, suspended_by: null }).eq('id', LOUNGE);
    if (partnerId) {
      const { data: users } = await service.from('partner_members').select('user_id').eq('partner_id', partnerId);
      await service.from('partners').delete().eq('id', partnerId);
      for (const u of users ?? []) if (u.user_id) await service.auth.admin.deleteUser(u.user_id);
    }
    if (memberId) await service.auth.admin.deleteUser(memberId);
    console.log(errors.length ? `errores de página:\n${errors.join('\n')}` : 'sin errores de página');
    console.log(findings.length ? `hallazgos:\n${findings.join('\n')}` : 'sin hallazgos');
  }
})();
