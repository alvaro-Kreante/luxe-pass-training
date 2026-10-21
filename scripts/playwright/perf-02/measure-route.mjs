// PERF-02 — una ruta antes/después de pasar a Server Component.
// ROUTE, HEADING y DATA (texto que debe venir ya en el HTML) por entorno;
// por defecto la ficha de The Ainsworth.
//
// Para comparar dos versiones, servir cada build a la vez en su propio
// puerto (BASE) e intercalar las tandas: parar y relanzar `next start` en el
// mismo puerto desde Git Bash puede dejar vivo el servidor anterior
// (`taskkill` no siempre lo cierra) y medir la versión equivocada.
// Requiere `npm run build` + `npx next start -p 3020` y Supabase local.
// node scripts/playwright/perf-02/measure-route.mjs [veces]
import { chromium, devices } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3020", PW = "EnSoleil!2026", ROUTE = process.env.ROUTE ?? "/lounges/the-ainsworth", NAME = process.env.HEADING ?? "The Ainsworth", DATA = process.env.DATA ?? NAME;
const runs = Number(process.argv[2] ?? 3);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ROLE=member (por defecto) | admin | partner — mismo alta que audit-perf-a11y/measure.mjs.
const ROLE = process.env.ROLE ?? "member";
const email = `perf02-${ROLE}-${Date.now()}@example.com`;
if (ROLE === "partner") { // partner_members antes que la cuenta de Auth (trigger "already in use")
  const partnerId = (await admin.from("lounges").select("partner_id").not("partner_id", "is", null).limit(1).single()).data.partner_id;
  const r = await admin.from("partner_members").insert({ partner_id: partnerId, first_name: "Perf", last_name: "Two", email }); if (r.error) throw r.error;
}
const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw error;
if (ROLE === "partner") {
  await admin.from("partner_members").update({ user_id: data.user.id }).eq("email", email);
  await admin.from("user_roles").insert({ user_id: data.user.id, role: "partner" });
}
if (ROLE === "member") await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Two", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
if (ROLE === "admin") await admin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
const LOGIN = { member: "/login", admin: "/admin/login", partner: "/partner/login" }[ROLE];

const INIT = () => {
  window.__m = { lcp: 0, lt: [] };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lt.push(e.duration); }).observe({ type: "longtask", buffered: true });
};
const browser = await chromium.launch({ headless: true });
// Sin service worker: la PWA serviría peticiones que Playwright no ve como de la página.
// DESKTOP=1 mide a 1440×900 (la consola de admin es de escritorio).
const device = process.env.DESKTOP ? { viewport: { width: 1440, height: 900 } } : { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } };
const ctx = await browser.newContext({ ...device, serviceWorkers: "block" });
await ctx.addInitScript(INIT);
const results = [];
try {
  const login = await ctx.newPage();
  await login.goto(BASE + LOGIN); await login.getByLabel(/Email/i).first().fill(email);
  await login.getByRole("textbox", { name: "Password" }).fill(PW); await login.getByRole("button", { name: /Log in|Sign in/i }).click();
  await login.waitForURL((u) => !u.pathname.endsWith("login"), { timeout: 60000 }); await login.close();

  for (let i = 0; i < runs; i++) {
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    let supabaseRequests = 0;
    page.on("request", (r) => { if (r.url().startsWith(env.NEXT_PUBLIC_SUPABASE_URL)) supabaseRequests++; });
    const t0 = Date.now();
    const response = await page.goto(BASE + ROUTE, { waitUntil: "commit", timeout: 120000 });
    const html = await response.text();
    await page.getByRole("heading", { name: NAME }).waitFor({ timeout: 120000 });
    const headingMs = Date.now() - t0;
    await page.waitForTimeout(6000);
    // DEBUG=1 enseña qué texto de datos hay en el HTML inicial y en la página ya cargada.
    if (process.env.DEBUG) console.log("html:", html.match(/\d+ of \d+|Upcoming.{0,40}/)?.[0], "| página:", (await page.evaluate(() => document.body.innerText)).match(/\d+ of \d+/)?.[0]);
    const m = await page.evaluate(() => window.__m);
    results.push({ htmlHasData: html.replace(/<!-- -->/g, "").includes(DATA), headingMs, lcp: Math.round(m.lcp), tbt: Math.round(m.lt.reduce((a, d) => a + Math.max(0, d - 50), 0)), supabaseRequests });
    await page.close();
  }
} finally {
  await browser.close();
  if (ROLE === "partner") await admin.from("partner_members").delete().eq("email", email);
  await admin.auth.admin.deleteUser(data.user.id);
}
for (const r of results) console.log(JSON.stringify(r));
