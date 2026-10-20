// PERF-02 — captura de /lounges/the-ainsworth a 1440×900 para compararla con Main.dc.html.
// node scripts/playwright/perf-02/screenshot-lounge.mjs (con `next start -p 3020`)
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3020", PW = "EnSoleil!2026";
const OUT = path.join(root, "scripts/playwright/screenshots/perf-02"); fs.mkdirSync(OUT, { recursive: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `perf02-shot-${Date.now()}@example.com`;
const { data } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Shot", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
try {
  await page.goto(BASE + "/login"); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.getByRole("button", { name: "Log in" }).click(); await page.waitForURL((u) => !u.pathname.endsWith("login"));
  await page.goto(BASE + "/lounges/the-ainsworth"); await page.getByRole("heading", { name: "The Ainsworth" }).waitFor();
  await page.waitForTimeout(2000); await page.screenshot({ path: path.join(OUT, "lounge.png") });
  await page.getByRole("button", { name: /View all \d photos/ }).click(); await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "lounge-gallery.png") });
  console.log("ok");
} finally { await browser.close(); await admin.auth.admin.deleteUser(data.user.id); }
