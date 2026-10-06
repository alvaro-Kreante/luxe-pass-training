const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Story 10.10 — revisión visual del editor de fotos frente a PhotoCropOpen
// (23), PhotoCropSize (24), PhotoUploading (25), PhotoRecrop (26) y
// PhotoInvalidFile (27). Crea un lounge en borrador `test-…` y lo borra al
// terminar (las fotos huérfanas las limpia la suite con `cleanTestData`).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/epic10-photos');
const ROOT = path.resolve(__dirname, '../../../..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const LOUNGE = `test-lounge-photo-visual-${Date.now()}`;
const PHOTO = process.env.PHOTO || path.join(ROOT, 'docs/specs/flows/images/onboarding.jpg');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log('shot', name);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdf = path.join(os.tmpdir(), 'ainsworth-menu.pdf');
  fs.writeFileSync(pdf, '%PDF-1.4 not an image');
  const { error } = await service.from('lounges').insert({
    id: LOUNGE, name: 'The Ainsworth (photos)', neighborhood: 'Midtown East', city: 'New York', city_id: 'new-york',
    address: '122 E 45th St', lat: 40.75, lng: -73.97, hours: 'Open until 10 PM', bands: ['morning'],
    weekly_hours: Array(7).fill('8 AM – 10 PM'), capacity: 20, content_status: 'draft',
  });
  if (error) throw error;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  try {
    await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).first().fill('alvaro+admin@kreante.co');
    await page.getByLabel(/password/i).first().fill('Pa$$w0rd!');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 });
    await page.goto(`${BASE}/admin/lounges/${LOUNGE}`);
    const input = page.getByLabel('Add lounge photos');
    await input.waitFor({ state: 'attached', timeout: 60000 });

    await input.setInputFiles(PHOTO);
    const editor = page.getByRole('dialog', { name: 'Frame this photo' });
    await editor.waitFor();
    await page.waitForTimeout(800);
    await shot(page, '23-crop-open');
    await editor.getByRole('slider', { name: 'Zoom' }).fill('1.6');
    await editor.getByRole('radio', { name: /Light · 1200 px/ }).check();
    await shot(page, '24-crop-size');
    await editor.getByRole('button', { name: 'Use photo' }).click();
    await page.waitForTimeout(150);
    await shot(page, '25-uploading');
    await page.getByRole('button', { name: /^Adjust crop/ }).waitFor({ timeout: 20000 });

    await page.getByRole('button', { name: /^Adjust crop/ }).click();
    await page.getByRole('dialog', { name: 'Adjust the crop' }).waitFor();
    await page.waitForTimeout(800);
    await shot(page, '26-recrop');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await input.setInputFiles(pdf);
    await page.getByText("ainsworth-menu.pdf isn't an image").waitFor();
    await shot(page, '27-invalid');
  } finally {
    await browser.close();
    await service.from('lounges').delete().eq('id', LOUNGE);
    console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
