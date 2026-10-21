const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Story 10.8 — el partner como contexto en la ficha y en /explore (miembro de prueba temporal).
const BASE = process.env.LUXEPASS_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(__dirname, '../../screenshots/explore');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../../../../.env.local'), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);

(async () => {
  const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const email = `visual-member-${Date.now()}@ensoleil-test.example`;
  const { data: created } = await service.auth.admin.createUser({ email, password: 'EnSoleil!2026', email_confirm: true });
  await service.from('profiles').insert({ id: created.user.id, full_name: 'Visual Member', phone: '+15555550100', city: 'New York', industry: 'Testing', terms_accepted_at: new Date().toISOString() });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') console.log('console', msg.type(), msg.text().slice(0, 240)); });
  try {
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).first().fill('EnSoleil!2026');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }).catch(async (e) => { await page.screenshot({ path: path.join(OUT_DIR, 'login-debug.png') }); throw e; });

    await page.goto(BASE + '/lounges/halcyon-reading-room', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Halcyon Reading Room' }).waitFor({ timeout: 20000 });
    await page.screenshot({ path: path.join(OUT_DIR, 'profile-partner.png') });
    console.log('shot profile-partner.png');

    await page.goto(BASE + '/explore', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const dismiss = page.getByRole('button', { name: /enter a location instead/i });
    if (await dismiss.count()) await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'explore-partner.png') });
    const issues = page.locator('[data-nextjs-toast]');
    if (await issues.count()) {
      await issues.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT_DIR, 'explore-issue.png') });
      console.log('shot explore-issue.png');
    }
    console.log('shot explore-partner.png');
  } finally {
    await browser.close();
    await service.auth.admin.deleteUser(created.user.id);
  }
})();
