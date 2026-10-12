/**
 * Ticket 001 — formulario de tarjeta nueva en blanco en `/book/payment`.
 *
 * Dos miembros: uno sin tarjetas y otro con una Visa guardada. Por cada uno:
 * elige "Use a new card", y mide llamadas a `stripe-create-checkout-session`,
 * filas `payments` en `pending`, avisos de consola, altura del hueco y si el
 * formulario de Stripe es editable. Con `--pay` completa el pago con 4242 y
 * comprueba que la fila confirmada es la que se creó (sin tarjetas, marcando
 * antes "Save this card" y comprobando que queda guardada).
 *
 * Precondiciones: `npm run dev`, `supabase start`,
 * `supabase functions serve --env-file supabase/functions/.env` y, para `--pay`,
 * `stripe listen` reenviando a `stripe-webhook`.
 *
 * Uso: node scripts/playwright/scripts/booking/ticket-001-new-card-verification.js [--pay]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { launchBrowser, navigateTo, takeScreenshot } = require('../../utils/browser');

const ROOT = path.resolve(__dirname, '../../../..');
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
}

const PASSWORD = 'EnSoleil!2026';
const PAY = process.argv.includes('--pay');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const shots = (name) => path.join(__dirname, `../../screenshots/booking/${Date.now()}-ticket001-${name}.png`);

async function stripeApi(pathname, params) {
  const response = await fetch(`https://api.stripe.com/v1/${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? 'Stripe error');
  return json;
}

async function createMember(label, withSavedCard) {
  const email = `ticket001-${label}-${Date.now()}@ensoleil-test.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const profile = {
    id: data.user.id,
    full_name: `Ticket 001 ${label}`,
    phone: '+15555550100',
    city: 'New York',
    industry: 'Testing',
    terms_accepted_at: new Date().toISOString(),
  };
  if (withSavedCard) {
    const customer = await stripeApi('customers', { email, 'metadata[member_id]': data.user.id });
    await stripeApi('payment_methods/pm_card_visa/attach', { customer: customer.id }).then((pm) =>
      stripeApi(`customers/${customer.id}`, { 'invoice_settings[default_payment_method]': pm.id }),
    );
    profile.stripe_customer_id = customer.id;
  }
  const { error: profileError } = await admin.from('profiles').insert(profile);
  if (profileError) throw profileError;
  return { email, id: data.user.id };
}

async function paymentRows(memberId) {
  const { data } = await admin.from('payments').select('id,status,booking_id').eq('member_id', memberId).order('created_at');
  return data ?? [];
}

async function formState(page) {
  const host = page.getByText(/Loading Stripe/);
  const frame = page.locator('iframe[title="Secure payment input frame"]');
  const frameBox = (await frame.count()) ? await frame.first().boundingBox() : null;
  const rowBox = await page.getByRole('radio', { name: /Use a new card/ }).boundingBox();
  const checkboxBox = await page.getByText('Save this card for future bookings').boundingBox();
  return {
    loadingVisible: await host.isVisible().catch(() => false),
    iframes: await frame.count(),
    frameBox,
    newCardRowBottom: rowBox && rowBox.y + rowBox.height,
    saveCardTop: checkboxBox?.y,
  };
}

async function run(browser, label, withSavedCard) {
  console.log(`\n===== ${label} =====`);
  const member = await createMember(label, withSavedCard);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleLines = [];
  page.on('console', (msg) => {
    if (['warning', 'error'].includes(msg.type())) consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));
  let sessionCalls = 0;
  page.on('request', (req) => {
    if (req.url().includes('stripe-create-checkout-session') && req.method() === 'POST') sessionCalls++;
  });

  await navigateTo(page, '/login');
  await page.getByLabel('Email address').fill(member.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: /Log in/i }).click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15000 });

  await navigateTo(page, '/lounges/the-ainsworth/book');
  await page.getByRole('button', { name: '9' }).first().click();
  await page.getByRole('button', { name: /^\d{1,2}:\d{2} (AM|PM) ·/ }).first().click();
  await page.getByRole('link', { name: 'Choose payment method' }).click();
  await page.waitForURL('**/book/payment');
  await page.waitForTimeout(2500);
  console.log('radios:', await page.getByRole('radio').allInnerTexts());

  const newCard = page.getByRole('radio', { name: /Use a new card/ });
  const hit = await newCard.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return top === el || el.contains(top) ? 'row' : top?.outerHTML.slice(0, 120);
  });
  console.log('elemento bajo el centro de "Use a new card":', hit);
  await newCard.click();
  console.log('aria-checked tras click:', await newCard.getAttribute('aria-checked'));
  await page.waitForTimeout(6000);
  console.log('estado tras elegir tarjeta nueva:', await formState(page));
  console.log('llamadas a create-checkout-session:', sessionCalls);
  const scroller = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((node) => {
      const style = getComputedStyle(node);
      return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
    });
    return el ? `${el.tagName}.${el.className.toString().slice(0, 80)}` : 'document';
  });
  console.log('contenedor con scroll:', scroller);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(500);
  console.log('tras scroll de 300px:', await formState(page));
  console.log('payments:', await paymentRows(member.id));
  await takeScreenshot(page, shots(`${label}-new-card`));

  const cardFrame = page.frameLocator('iframe[title="Secure payment input frame"]').first();
  const cardTab = cardFrame.getByText('Card', { exact: true });
  if (await cardTab.count()) await cardTab.click();
  await page.waitForTimeout(1000);
  const number = cardFrame.getByRole('textbox', { name: /Card number/i });
  const editable = await number.isEditable({ timeout: 3000 }).catch(() => false);
  console.log('campo "Card number" editable:', editable);
  console.log('checkbox de guardado propio de Stripe:', await cardFrame.getByRole('checkbox').count());
  await page.screenshot({ path: shots(`${label}-card-tab`) });

  if (withSavedCard) {
    await page.getByRole('radio', { name: /ending in 4242/ }).click();
    await page.waitForTimeout(800);
    console.log('tras volver a la guardada:', await formState(page));
    await newCard.click();
    await page.waitForTimeout(3000);
    console.log('tras re-elegir tarjeta nueva:', await formState(page));
  }

  if (PAY && editable && !withSavedCard) {
    const saveLabel = page.getByText('Save this card for future bookings');
    await saveLabel.scrollIntoViewIfNeeded();
    // El contenedor fijo se recoloca en el render siguiente al scroll; un
    // clic en el mismo frame (solo posible para Playwright) caería en él.
    await page.waitForTimeout(300);
    console.log('antes de marcar:', await formState(page));
    console.log('bajo el texto "Save this card":', await saveLabel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + 10, r.y + r.height / 2);
      return el.contains(top) || top?.contains(el) ? 'label' : top?.outerHTML.slice(0, 160);
    }));
    await saveLabel.click();
    await page.waitForTimeout(5000);
    console.log('checkbox marcado:', await page.getByRole('checkbox', { name: /Save this card/ }).isChecked(), '· llamadas:', sessionCalls);
    console.log('tras marcar "Save this card":', await formState(page));
    console.log('payments tras marcar:', await paymentRows(member.id));
    if (await cardTab.count()) await cardTab.click();
    await page.waitForTimeout(1000);
  }

  if (PAY && editable) {
    await number.fill('4242424242424242');
    await cardFrame.getByRole('textbox', { name: /Expiration date/i }).fill('12/34');
    await cardFrame.getByRole('textbox', { name: /Security code/i }).fill('123');
    const postal = cardFrame.getByRole('textbox', { name: /ZIP|postal/i });
    if (await postal.count()) await postal.fill('10017');
    await page.getByRole('link', { name: 'Review and confirm' }).click();
    await page.waitForURL('**/book/summary');
    await page.getByRole('checkbox', { name: /accept the booking terms/ }).check({ force: true });
    await page.getByRole('button', { name: /Confirm and pay/ }).click();
    const reached = await page.waitForURL('**/book/confirmed', { timeout: 25000 }).then(() => true, () => false);
    console.log('/book/confirmed alcanzada:', reached);
    await page.waitForTimeout(5000);
    console.log('payments tras pagar:', await paymentRows(member.id));
    if (!withSavedCard) {
      await navigateTo(page, '/lounges/the-ainsworth/book');
      await page.getByRole('button', { name: '9' }).first().click();
      await page.getByRole('button', { name: /^\d{1,2}:\d{2} (AM|PM) ·/ }).first().click();
      await page.getByRole('link', { name: 'Choose payment method' }).click();
      await page.waitForURL('**/book/payment');
      await page.waitForTimeout(3000);
      console.log('tarjetas guardadas en la visita siguiente:', await page.getByRole('radio', { name: /ending in/ }).count());
    }
  }

  console.log('consola:', consoleLines.length ? consoleLines : '(limpia)');
  await page.close();
}

(async () => {
  const browser = await launchBrowser();
  try {
    await run(browser, 'no-cards', false);
    await run(browser, 'saved-card', true);
  } catch (error) {
    console.error('❌', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
