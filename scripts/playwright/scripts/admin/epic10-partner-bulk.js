const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Story 10.11 — revisión visual de las acciones masivas frente a
// PartnerBulkSelect (28) … PartnerBulkResult (34). Crea un partner activo
// con cinco lounges `test-…` y los borra al terminar.
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/epic10-bulk');
const ROOT = path.resolve(__dirname, '../../../..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const stamp = Date.now();

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log('shot', name);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { data: partner, error } = await service.from('partners')
    .insert({ name: `Ainsworth Collection (visual ${stamp})`, status: 'active', contact_email: 'reservations@ainsworth-test.com', address_line1: '120 E 56th St', city: 'New York' })
    .select('id').single();
  if (error) throw error;
  const complete = { phone: '+1 212 555 0100', email: 'hello@ainsworth-test.com', address: '1 Main St', weekly_hours: Array(7).fill('8 AM – 10 PM') };
  const base = { city: 'New York', city_id: 'new-york', lat: 0, lng: 0, hours: 'Open', bands: ['morning'], partner_id: partner.id };
  const id = (slug) => `test-lounge-bulk-visual-${stamp}-${slug}`;
  const { error: loungeError } = await service.from('lounges').insert([
    { ...base, ...complete, id: id('a'), name: 'The Ainsworth', neighborhood: 'Midtown East', capacity: 32, content_status: 'live' },
    { ...base, ...complete, id: id('b'), name: 'Ainsworth Hudson Yards', neighborhood: 'Hudson Yards', capacity: 26, content_status: 'suspended', suspended_by: 'admin' },
    { ...base, ...complete, id: id('c'), name: 'Ainsworth Tribeca', neighborhood: 'Tribeca', capacity: 20, content_status: 'draft' },
    { ...base, ...complete, id: id('d'), name: 'Ainsworth SoHo', neighborhood: 'SoHo', capacity: 0, content_status: 'draft' },
    { ...base, ...complete, id: id('e'), name: 'Ainsworth Brooklyn Heights', neighborhood: 'Brooklyn Heights', city: 'Brooklyn', capacity: 22, content_status: 'draft' },
  ]);
  if (loungeError) throw loungeError;
  await service.from('lounge_seasons').insert({ lounge_id: id('e'), name: 'Holiday season', starts_on: '2025-12-20', ends_on: '2026-01-04', weekly_hours: Array(7).fill('10 AM – 6 PM') });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Vector Map/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  try {
    await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).first().fill('alvaro+admin@kreante.co');
    await page.getByLabel(/password/i).first().fill('Pa$$w0rd!');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
    await page.goto(`${BASE}/admin/partners/${partner.id}`);
    const list = page.getByRole('list', { name: 'Lounges' });
    await list.waitFor({ timeout: 60000 });
    const pick = (name) => list.getByRole('listitem', { name }).getByRole('checkbox').check({ force: true });

    await pick('Ainsworth Tribeca');
    await pick('Ainsworth SoHo');
    await pick('Ainsworth Brooklyn Heights');
    await page.getByRole('searchbox', { name: "Search this partner's lounges" }).fill('New York');
    await list.scrollIntoViewIfNeeded();
    await shot(page, '28-select');
    await page.getByRole('searchbox', { name: "Search this partner's lounges" }).fill('');

    await page.getByRole('button', { name: 'Change status' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: /^Live/ }).check();
    await shot(page, '29-status');
    await page.getByRole('dialog').getByRole('button', { name: 'Review change' }).click();
    await page.getByRole('dialog', { name: /Publish 2 of 3/ }).waitFor();
    await shot(page, '33-confirm');
    await page.getByRole('dialog').getByRole('button', { name: 'Back' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Set hours' }).click();
    await page.getByRole('dialog', { name: 'Same weekly hours' }).waitFor();
    await shot(page, '30-hours');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Add season' }).click();
    const season = page.getByRole('dialog', { name: 'Same season everywhere' });
    await season.getByLabel('Name · optional').fill('Holiday hours');
    await season.getByLabel('From').fill('2025-12-22');
    await season.getByLabel('To').fill('2026-01-02');
    await season.getByText(/Clashes with a season/).waitFor();
    await shot(page, '31-season');
    await season.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Add closure' }).click();
    const closure = page.getByRole('dialog', { name: 'Same closure everywhere' });
    await closure.getByLabel('From').fill('2025-09-12');
    await closure.getByLabel('To').fill('2025-09-13');
    await closure.getByLabel('Reason · members see it').fill('Private event');
    await closure.getByText(/in this closure/).waitFor();
    await shot(page, '32-closure');
    await closure.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: 'Change status' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: /^Live/ }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Review change' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publish 2 lounges' }).click();
    await page.getByRole('dialog', { name: /Published in 2 of 3/ }).waitFor({ timeout: 20000 });
    await shot(page, '34-result');
  } finally {
    await browser.close();
    await service.from('lounges').delete().like('id', `test-lounge-bulk-visual-${stamp}-%`);
    await service.from('partners').delete().eq('id', partner.id);
    console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
