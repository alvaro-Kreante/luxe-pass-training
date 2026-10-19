// PERF-11 — Stripe.js solo se descarga al llegar al pago.
// Requiere `npm run dev -- -p 3016` y Supabase local.
// node scripts/playwright/perf-11/verify-stripe-lazy.mjs
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3016", PW = "EnSoleil!2026";
const OUT = path.join(root, "scripts/playwright/screenshots/perf-11"); fs.mkdirSync(OUT, { recursive: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const email = `perf11-${Date.now()}@example.com`;
const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw error;
await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Eleven", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
let stripe = [];
page.on("request", (r) => { if (/stripe\.(com|network)/.test(r.url())) stripe.push(r.url()); });
const result = { consoleErrors: [] };
page.on("console", (m) => { if (m.type() === "error") result.consoleErrors.push(m.text().slice(0, 160)); });
try {
  await page.goto(BASE + "/login"); await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PW); await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("login"), { timeout: 60000 });

  stripe = []; await page.goto(BASE + "/profile/membership", { waitUntil: "load" }); await page.waitForTimeout(6000);
  result.profileMembership = stripe.length;

  stripe = []; await page.goto(BASE + "/lounges/the-ainsworth/book", { waitUntil: "load" }); await page.waitForTimeout(6000);
  result.bookStep1 = stripe.length;

  const days = page.getByRole("button", { name: /^\d{1,2}$/ });
  for (let i = 0; i < await days.count(); i++) {
    const day = days.nth(i); if (!(await day.isEnabled())) continue;
    await day.click(); await page.waitForTimeout(1500);
    const slot = page.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM) ·/ }).first();
    if (await slot.count()) { await slot.click(); break; }
  }
  await page.getByRole("link", { name: "Choose payment method" }).click();
  await page.waitForURL(/\/book\/payment/, { timeout: 30000 }); await page.waitForTimeout(4000);
  result.bookPaymentBeforeCard = stripe.length;
  await page.getByText("Use a new card").click(); await page.waitForTimeout(10000);
  result.bookPaymentNewCard = stripe.length;
  result.paymentElementFrames = page.frames().filter((f) => /js\.stripe\.com/.test(f.url())).length;
  await page.screenshot({ path: path.join(OUT, "book-payment.png") });
} catch (e) {
  result.error = String(e); await page.screenshot({ path: path.join(OUT, "FAIL.png") });
} finally {
  await browser.close(); await admin.auth.admin.deleteUser(data.user.id);
}
console.log(JSON.stringify(result));
