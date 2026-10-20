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

const email = `perf02-${Date.now()}@example.com`;
const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw error;
await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Two", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });

const INIT = () => {
  window.__m = { lcp: 0, lt: [] };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lt.push(e.duration); }).observe({ type: "longtask", buffered: true });
};
const browser = await chromium.launch({ headless: true });
// Sin service worker: la PWA serviría peticiones que Playwright no ve como de la página.
const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.addInitScript(INIT);
const results = [];
try {
  const login = await ctx.newPage();
  await login.goto(BASE + "/login"); await login.getByLabel("Email address").fill(email);
  await login.getByLabel("Password", { exact: true }).fill(PW); await login.getByRole("button", { name: "Log in" }).click();
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
} finally { await browser.close(); await admin.auth.admin.deleteUser(data.user.id); }
for (const r of results) console.log(JSON.stringify(r));
