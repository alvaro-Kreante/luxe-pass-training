// PERF-02 — un miembro sin rol admin no entra en /admin/analytics (servidor).
// node scripts/playwright/perf-02/check-admin-guard.mjs (con `next start -p 3024`)
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3024", PW = "EnSoleil!2026";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `perf02-notadmin-${Date.now()}@example.com`;
const { data } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
await admin.from("profiles").insert({ id: data.user.id, full_name: "Not Admin", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ serviceWorkers: "block" })).newPage();
try {
  await page.goto(BASE + "/login"); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(PW);
  await page.getByRole("button", { name: "Log in" }).click(); await page.waitForURL((u) => !u.pathname.endsWith("login"));
  const response = await page.goto(BASE + "/admin/analytics");
  console.log("miembro sin rol ->", new URL(page.url()).pathname, "| primera respuesta:", response.request().redirectedFrom() ? 307 : response.status(), "| ve datos:", await page.getByText("How the network is doing").count() > 0);
} finally { await browser.close(); await admin.auth.admin.deleteUser(data.user.id); }
