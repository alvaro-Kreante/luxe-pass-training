// Auditoría medida rendimiento + a11y (móvil 390, 4x CPU, red ~slow 4G).
// Requiere `npm run build` + `npx next start -p 3006`. Solo Supabase local.
// node scripts/playwright/audit-perf-a11y/measure.mjs
import { chromium, devices } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const BASE = "http://localhost:3006", PW = "EnSoleil!2026", OUT = path.join(root, "scripts/playwright/audit-perf-a11y/screenshots");
fs.mkdirSync(OUT, { recursive: true });
const AXE = fs.readFileSync(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
export const admin = createClient(SB, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const created = [];
export async function mkUser(kind) {
  const email = `perfa11y-${kind}-${Date.now()}@example.com`;
  let partnerId;
  if (kind === "partner") { // partner_members antes que la cuenta de Auth (trigger "already in use")
    partnerId = (await admin.from("lounges").select("partner_id").eq("id", "the-ainsworth").single()).data.partner_id;
    const r = await admin.from("partner_members").insert({ partner_id: partnerId, first_name: "Perf", last_name: "Audit", email }); if (r.error) throw r.error;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw error;
  created.push({ id: data.user.id, email });
  if (kind === "member") await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Audit", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
  if (kind === "partner") {
    await admin.from("partner_members").update({ user_id: data.user.id }).eq("email", email);
    await admin.from("user_roles").insert({ user_id: data.user.id, role: "partner" });
  }
  if (kind === "admin") await admin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
  return email;
}
const INIT = () => {
  window.__m = { lcp: 0, cls: 0, lt: [] };
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.lt.push(e.duration); }).observe({ type: "longtask", buffered: true });
};
export async function ctxFor(storage, extra = {}) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, storageState: storage, permissions: ["geolocation"], geolocation: { latitude: 40.7549, longitude: -73.984 }, ...extra });
  await ctx.addInitScript(INIT); return { browser, ctx };
}
export async function login(email, route) {
  const { browser, ctx } = await ctxFor(); const p = await ctx.newPage();
  await p.goto(BASE + route); await p.getByLabel(/Email/i).first().fill(email);
  await p.getByRole("textbox", { name: "Password" }).fill(PW); await p.getByRole("button", { name: /Log in|Sign in/i }).click();
  await p.waitForURL(u => !u.pathname.endsWith("login"), { timeout: 45000 }); await p.waitForTimeout(2500);
  const s = await ctx.storageState(); await browser.close(); return s;
}
async function measure(storage, route, name) {
  const { browser, ctx } = await ctxFor(storage); const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const reqs = [];
  page.on("requestfinished", async r => { const s = await r.sizes().catch(() => null); reqs.push({ url: r.url(), type: r.resourceType(), method: r.method(), bytes: s ? s.responseBodySize + s.responseHeadersSize : 0 }); });
  const t0 = Date.now(); await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 }); const loadMs = Date.now() - t0;
  await page.waitForTimeout(7000);
  const m = await page.evaluate(() => ({ ...window.__m, fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0 }));
  const tbt = m.lt.reduce((a, d) => a + Math.max(0, d - 50), 0);
  const sum = t => Math.round(reqs.filter(t).reduce((a, r) => a + r.bytes, 0) / 1024);
  const sb = reqs.filter(r => r.url.startsWith(SB) && r.method !== "OPTIONS");
  const key = r => r.method + " " + r.url.replace(SB, "").split("?")[0];
  const counts = {}; for (const r of sb) counts[key(r)] = (counts[key(r)] || 0) + 1;
  const dups = Object.entries(counts).filter(([, c]) => c > 1).map(([k, c]) => `${k} x${c}`);
  const imgs = reqs.filter(r => r.type === "image").map(r => ({ u: r.url.slice(0, 140), kb: Math.round(r.bytes / 1024) })).sort((a, b) => b.kb - a.kb).slice(0, 5);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.addScriptTag({ content: AXE });
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] });
    return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(n => n.target.join(" ") + " | " + (n.any[0]?.message || n.failureSummary || "").slice(0, 160)) }));
  });
  const dom = await page.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; };
    const tgt = [...document.querySelectorAll("a,button,input:not([type=hidden]),select,[role=button],[role=tab],[role=checkbox]")].filter(vis);
    const sz = e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
    const small = tgt.filter(e => { const [w, h] = sz(e); return w < 24 || h < 24; }).map(e => (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 30) + `(${sz(e).join("x")})`);
    return {
      theme: document.querySelector("[data-theme]")?.getAttribute("data-theme") || "light",
      main: document.querySelectorAll("main,[role=main]").length, nav: document.querySelectorAll("nav").length,
      h1: [...document.querySelectorAll("h1")].map(h => h.textContent.trim().slice(0, 40)),
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(h => h.tagName[1]).join(""),
      live: document.querySelectorAll("[aria-live],[role=status],[role=alert]").length,
      targets: tgt.length, small24: small.slice(0, 8), small24n: small.length,
      under44: tgt.filter(e => { const [w, h] = sz(e); return w < 44 || h < 44; }).length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, lang: document.documentElement.lang,
    };
  });
  await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(800);
  const zoom = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: path.join(OUT, `${name}-zoom200.png`) });
  await browser.close();
  const r = {
    route, name, loadMs, fcp: Math.round(m.fcp), lcp: Math.round(m.lcp), cls: +m.cls.toFixed(3), tbt: Math.round(tbt), longtasks: m.lt.length,
    totalKB: sum(() => true), jsKB: sum(x => x.type === "script"), imgKB: sum(x => x.type === "image"), fontKB: sum(x => x.type === "font"), requests: reqs.length,
    supabase: sb.length, authUser: counts["GET /auth/v1/user"] || 0, sbCounts: counts, dups, imgs,
    thirdParty: [...new Set(reqs.filter(x => /googleapis|gstatic|stripe/.test(x.url)).map(x => new URL(x.url).host))], thirdKB: sum(x => /googleapis|gstatic|stripe/.test(x.url)),
    axe, dom, zoomOverflow: zoom,
  };
  console.log(JSON.stringify({ route, lcp: r.lcp, cls: r.cls, tbt: r.tbt, jsKB: r.jsKB, sb: r.supabase, authUser: r.authUser, axe: axe.map(a => a.id + ":" + a.n).join(","), ov: dom.overflow, zoom }));
  return r;
}
if (process.argv[1].endsWith("measure.mjs")) {
  const which = process.argv[2] || "all"; const P = path.join(OUT, "metrics.json");
  const results = fs.existsSync(P) && which !== "all" ? JSON.parse(fs.readFileSync(P, "utf8")) : [];
  let mem, par, adm;
  if (which === "all" || which === "member") {
    for (const r of ["/", "/login", "/signup", "/explore"]) results.push(await measure(undefined, r, "anon" + r.replace(/\//g, "-")));
    mem = await login(await mkUser("member"), "/login");
    for (const r of ["/explore", "/lounges/the-ainsworth", "/lounges/the-ainsworth/book", "/my-pass", "/profile"]) results.push(await measure(mem, r, "member" + r.replace(/\//g, "-")));
  }
  if (which === "all" || which === "staff") {
  const par = await login(await mkUser("partner"), "/partner/login");
  for (const r of ["/partner", "/partner/analytics"]) results.push(await measure(par, r, "partner" + r.replace(/\//g, "-")));
  const adm = await login(await mkUser("admin"), "/admin/login");
  for (const r of ["/admin/members", "/admin/analytics", "/admin/lounges/the-ainsworth"]) results.push(await measure(adm, r, "admin" + r.replace(/\//g, "-")));
  }
  fs.writeFileSync(P, JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT, "..", ".storage.json"), JSON.stringify({ mem, par, adm, created }));
}
