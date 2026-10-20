// PERF-02 — /admin/analytics a 1440×900 (14 días y Month) con un admin de prueba.
// node scripts/playwright/perf-02/screenshot-admin-analytics.mjs (con `next start -p 3024`)
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3024", PW = "EnSoleil!2026";
const OUT = path.join(root, "scripts/playwright/screenshots/perf-02"); fs.mkdirSync(OUT, { recursive: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `perf02-shot-admin-${Date.now()}@example.com`;
const { data } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
await admin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" })).newPage();
try {
  await page.goto(BASE + "/admin/login"); await page.getByLabel(/Email/i).first().fill(email); await page.getByRole("textbox", { name: "Password" }).fill(PW);
  await page.getByRole("button", { name: /Log in|Sign in/i }).click(); await page.waitForURL((u) => !u.pathname.endsWith("login"));
  await page.goto(BASE + "/admin/analytics"); await page.getByRole("heading", { name: "How the network is doing" }).waitFor(); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "admin-analytics-14d.png") });
  await page.getByRole("button", { name: "Month" }).click(); await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, "admin-analytics-month.png") });
  console.log("ok");
} finally { await browser.close(); await admin.auth.admin.deleteUser(data.user.id); }
