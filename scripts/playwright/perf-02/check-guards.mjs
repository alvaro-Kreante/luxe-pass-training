// PERF-02 — guard de sesión y 404 de /lounges/[id] en servidor.
// node scripts/playwright/perf-02/check-guards.mjs (con `next start -p 3020`)
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3020", PW = "EnSoleil!2026";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `perf02-guard-${Date.now()}@example.com`;
const { data } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
await admin.from("profiles").insert({ id: data.user.id, full_name: "Perf Guard", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
try {
  await page.goto(BASE + "/lounges/the-ainsworth"); await page.waitForURL(/\/login/, { timeout: 30000 });
  console.log("sin sesión ->", new URL(page.url()).pathname);
  await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.getByRole("button", { name: "Log in" }).click(); await page.waitForURL((u) => !u.pathname.endsWith("login"));
  const missing = await page.goto(BASE + "/lounges/test-no-such-lounge");
  console.log("lounge inexistente ->", missing.status(), await page.getByText(/could not be found|not found/i).first().isVisible());
  const ok = await page.goto(BASE + "/lounges/the-ainsworth");
  await page.getByRole("heading", { name: "The Ainsworth" }).waitFor({ timeout: 30000 });
  console.log("lounge real ->", ok.status(), "título visible");
  const loading = await page.goto(BASE + "/lounges/the-ainsworth?loading=1");
  await page.waitForLoadState("networkidle").catch(() => {});
  console.log("?loading=1 ->", loading.status(), await page.getByText("Checking live availability…").first().isVisible(), "título:", await page.getByRole("heading", { name: "The Ainsworth" }).count());
} finally { await browser.close(); await admin.auth.admin.deleteUser(data.user.id); }
