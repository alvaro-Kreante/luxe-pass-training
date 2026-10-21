const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Story 10.9 — revisión visual de temporadas y cierres frente a
// SeasonalEmpty (17), SeasonalEdit (18), SeasonalOverlap (19), ClosureEdit
// (20), ClosureBookingsWarning (21) y SeasonalFilled (22). Crea un lounge
// live `test-…` y lo borra al terminar.
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/epic10-seasons');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../../../../.env.local'), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const stamp = Date.now();
const LOUNGE = `test-lounge-seasons-visual-${stamp}`;
const MEMBER = `seasons-visual-${stamp}@ensoleil-test.example`;

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
  console.log('shot', name);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const week = ['10 AM – 10 PM', '8 AM – 10 PM', '8 AM – 10 PM', '8 AM – 10 PM', '8 AM – 10 PM', '8 AM – 10 PM', '10 AM – 10 PM'];
  const { error } = await service.from('lounges').insert({
    id: LOUNGE, name: 'The Ainsworth (visual)', neighborhood: 'Midtown East', city: 'New York', city_id: 'new-york',
    address: '122 E 45th St', lat: 40.75, lng: -73.97, hours: 'Open until 10 PM', bands: ['morning', 'afternoon', 'evening'],
    amenities: ['wifi'], weekly_hours: week, capacity: 20, content_status: 'live',
  });
  if (error) throw error;
  await service.from('lounge_images').insert({ lounge_id: LOUNGE, url: 'https://example.com/main-room.jpg', caption: 'Main room', position: 0 });
  const { data: member } = await service.auth.admin.createUser({ email: MEMBER, email_confirm: true });
  await service.from('profiles').insert({ id: member.user.id, full_name: 'Alexandra Rivas', phone: '+15555550100', city: 'New York', industry: 'Testing', terms_accepted_at: new Date().toISOString() });
  await service.from('bookings').insert({ member_id: member.user.id, lounge_id: LOUNGE, date: '2025-09-12', band: 'morning', slot_time: '10:30 AM' });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).first().fill('alvaro+admin@kreante.co');
    await page.getByLabel(/password/i).first().fill('Pa$$w0rd!');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });

    await page.goto(`${BASE}/admin/lounges/${LOUNGE}`);
    const seasons = page.getByRole('region', { name: 'Seasonal hours' });
    const closures = page.getByRole('region', { name: 'Special closures' });
    await seasons.waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot(page, '17-empty');

    await seasons.getByRole('button', { name: 'Add season' }).click();
    const editor = seasons.getByRole('group', { name: 'New season' });
    await editor.getByLabel('Name · optional').fill('Summer hours');
    await editor.getByLabel('From').fill('2026-06-01');
    await editor.getByLabel('To').fill('2026-08-31');
    await editor.getByLabel('Mon opens at').selectOption('7:00 AM');
    await shot(page, '18-season-edit');
    await editor.getByRole('button', { name: 'Add season' }).click();
    await seasons.getByRole('listitem', { name: /Summer hours/ }).waitFor();

    await seasons.getByRole('button', { name: 'Add season' }).click();
    const late = seasons.getByRole('group', { name: 'New season' });
    await late.getByLabel('Name · optional').fill('Late summer');
    await late.getByLabel('From').fill('2026-08-20');
    await late.getByLabel('To').fill('2026-08-05');
    await shot(page, '19-season-overlap');
    await late.getByRole('button', { name: 'Cancel' }).click();

    await closures.getByRole('button', { name: 'Add closure' }).click();
    const closure = closures.getByRole('group', { name: 'New closure' });
    await closure.getByLabel('From').fill('2025-09-12');
    await closure.getByLabel('To').fill('2025-09-13');
    await closure.getByLabel('Reason · members see it').fill('Private event');
    await shot(page, '20-closure-edit');
    await closure.getByRole('button', { name: 'Add closure' }).click();
    await page.getByRole('dialog').waitFor();
    await shot(page, '21-closure-warning');
    await page.getByRole('dialog').getByRole('button', { name: 'Save anyway' }).click();
    await closures.getByRole('listitem', { name: /Private event/ }).waitFor();
    await shot(page, '22-filled');
  } finally {
    await browser.close();
    await service.from('lounges').delete().eq('id', LOUNGE);
    await service.auth.admin.deleteUser(member.user.id);
    console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
