/**
 * Verificación en navegador real del flujo de pago de la Story 4.2 —
 * concretamente el único tramo que Vitest no puede probar (jsdom no puede
 * montar Stripe.js/<PaymentElement>, ver
 * src/app/lounges/[id]/book/summary/page.test.tsx).
 *
 * Recorre: login real -> /book (elegir fecha/hora) -> /book/payment
 * ("Use a new card", <PaymentElement> real montado, tarjeta de prueba
 * 4242 4242 4242 4242) -> /book/summary (aceptar términos, "Confirm and
 * pay") -> /book/confirmed.
 *
 * Encontró y confirmó el fix de un bug real: mover el <PaymentElement> de
 * padre en el DOM (p. ej. con un React Portal) recarga el iframe y borra lo
 * escrito — por eso vive siempre en el mismo contenedor `position: fixed`
 * dentro de `stripe-checkout-bridge.tsx`, sincronizado por tamaño/posición
 * con el hueco que reserva `payment-method-form.tsx`, nunca reparentado.
 *
 * Precondiciones: `npm run dev`, `supabase start`,
 * `supabase functions serve --env-file supabase/functions/.env`.
 *
 * Uso: node scripts/playwright/scripts/booking/stripe-payment-flow-verification.js
 */

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

const EMAIL = `stripe-flow-${Date.now()}@ensoleil-test.example`;
const PASSWORD = 'EnSoleil!2026';

async function createConfirmedMember() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    full_name: 'Playwright Flow Test',
    phone: '+15555550100',
    city: 'New York',
    industry: 'Testing',
    terms_accepted_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
}

(async () => {
  try {
    console.log('⏳ Esperando que el servidor esté listo...');
    await waitForServer();

    console.log('👤 Creando miembro confirmado de prueba...');
    await createConfirmedMember();

    const browser = await launchBrowser();
    // Los artboards son desktop 1440×900 (ver CLAUDE.md) — un viewport más
    // angosto solapa el checkbox "Save this card" con el rail de confirmar.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const shots = (name) =>
      path.join(__dirname, `../../screenshots/booking/${Date.now()}-${name}.png`);

    console.log('🔐 Iniciando sesión...');
    await navigateTo(page, '/login');
    await page.getByLabel('Email address').fill(EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await page.getByRole('button', { name: /Log in/i }).click();
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15000 });

    console.log('📅 Paso 1 — visit details...');
    await navigateTo(page, '/lounges/the-ainsworth/book');
    await page.getByRole('button', { name: '9' }).first().click();
    await page.getByRole('button', { name: /^\d{1,2}:\d{2} (AM|PM) ·/ }).first().click();
    await page.getByRole('link', { name: 'Choose payment method' }).click();
    await page.waitForURL('**/book/payment');

    console.log('💳 Paso 2 — tarjeta nueva (Stripe real)...');
    await page.getByRole('radio', { name: /Use a new card/ }).click();
    await page.waitForTimeout(2000);
    await takeScreenshot(page, shots('payment-element-mounted'));
    console.log('✅ <PaymentElement> real montado (captura guardada)');

    const cardFrame = page.frameLocator('iframe[title="Secure payment input frame"]').first();
    await cardFrame.getByText('Card', { exact: true }).click();
    await page.waitForTimeout(1000);

    await cardFrame.getByRole('textbox', { name: /Card number/i }).fill('4242424242424242');
    await cardFrame.getByRole('textbox', { name: /Expiration date/i }).fill('12/34');
    await cardFrame.getByRole('textbox', { name: /Security code/i }).fill('123');
    const country = cardFrame.locator('#payment-countryInput');
    if (await country.count()) await country.selectOption('US');
    const postal = cardFrame.getByRole('textbox', { name: /ZIP|postal/i });
    if (await postal.count()) await postal.fill('10017');
    await takeScreenshot(page, shots('card-filled'));

    // "Review and confirm" es un <Link> (role "link") en cuanto hay un
    // método de pago elegido — no un <button>, ese solo aparece
    // deshabilitado antes de elegir uno (ver payment-summary-rail.tsx).
    await page.getByRole('link', { name: 'Review and confirm' }).click();
    await page.waitForURL('**/book/summary');

    console.log('✅ Paso 3 — aceptar términos y confirmar y pagar...');
    await page.getByRole('checkbox', { name: /accept the booking terms/ }).check({ force: true });
    await page.getByRole('button', { name: /Confirm and pay/ }).click();

    await page.waitForURL('**/book/confirmed', { timeout: 20000 });
    await takeScreenshot(page, shots('confirmed'));
    console.log('✅ Pago real confirmado y reserva creada — /book/confirmed alcanzada');

    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
