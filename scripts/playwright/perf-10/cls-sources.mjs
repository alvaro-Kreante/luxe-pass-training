// PERF-10 — CLS por ruta con el origen de cada shift (móvil 390, como la auditoría).
// Requiere `npm run build` + `npx next start -p 3018` y Supabase local.
// node scripts/playwright/perf-10/cls-sources.mjs [ruta ...]
import { chromium, devices } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3018", PW = "EnSoleil!2026";
fs.mkdirSync(path.join(root, "scripts/playwright/screenshots/perf-10"), { recursive: true });
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/explore"];
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const email = `perf10-${Date.now()}@example.com`;
const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw error;
await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Ten", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });

const INIT = () => {
  window.__shifts = [];
  const describe = (n) => !n ? "?" : (n.tagName ? n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (n.getAttribute?.("aria-label") ? `[${n.getAttribute("aria-label")}]` : "") + (typeof n.className === "string" && n.className ? "." + n.className.split(" ").slice(0, 3).join(".") : "") : "#text");
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: e.sources.map((s) => `${describe(s.node)} y${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}→${Math.round(s.currentRect.height)}`) }); }).observe({ type: "layout-shift", buffered: true });
};
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, permissions: ["geolocation"], geolocation: { latitude: 40.7549, longitude: -73.984 } });
await ctx.addInitScript(INIT);
const page = await ctx.newPage();
try {
  await page.goto(BASE + "/login"); await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PW); await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("login"), { timeout: 60000 });
  // Mismas condiciones que audit-perf-a11y/measure.mjs: ~slow 4G y CPU 4×.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (const route of routes) {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
    // SHOT=1 guarda la pantalla nada más cargar (estado de carga) y al final.
    const shot = (when) => process.env.SHOT && page.screenshot({ path: path.join(root, "scripts/playwright/screenshots/perf-10", `${route.replace(/\W+/g, "_")}-${when}.png`) });
    await shot("load");
    await page.waitForTimeout(10000);
    await shot("settled");
    const shifts = await page.evaluate(() => window.__shifts);
    console.log(`\n${route}  CLS=${shifts.reduce((a, s) => a + s.v, 0).toFixed(3)}`);
    for (const s of shifts) console.log(`  t=${s.t} ${s.v}  ${s.src.join(" | ")}`);
  }
} finally { await browser.close(); await admin.auth.admin.deleteUser(data.user.id); }
