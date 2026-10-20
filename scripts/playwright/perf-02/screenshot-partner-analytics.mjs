// PERF-02 — /partner/analytics a 1440×900 con un partner de prueba (lounge de los partners de muestra).
// BASE=http://localhost:3026 NAME=servidor node scripts/playwright/perf-02/screenshot-partner-analytics.mjs
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3026", PW = "EnSoleil!2026", NAME = process.env.NAME ?? "partner-analytics";
const OUT = path.join(root, "scripts/playwright/screenshots/perf-02"); fs.mkdirSync(OUT, { recursive: true });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `perf02-shot-partner-${Date.now()}@example.com`;
const partnerId = (await admin.from("lounges").select("partner_id").not("partner_id", "is", null).limit(1).single()).data.partner_id;
await admin.from("partner_members").insert({ partner_id: partnerId, first_name: "Perf", last_name: "Shot", email });
const { data } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
await admin.from("partner_members").update({ user_id: data.user.id }).eq("email", email);
await admin.from("user_roles").insert({ user_id: data.user.id, role: "partner" });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" })).newPage();
try {
  await page.goto(BASE + "/partner/login"); await page.getByLabel(/Email/i).first().fill(email); await page.getByRole("textbox", { name: "Password" }).fill(PW);
  await page.getByRole("button", { name: /Sign in/i }).click(); await page.waitForURL((u) => !u.pathname.endsWith("login"));
  await page.goto(BASE + "/partner/analytics"); await page.getByRole("heading", { name: "How things are going" }).waitFor(); await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, `${NAME}.png`) });
  console.log("ok");
} finally {
  await browser.close(); await admin.from("partner_members").delete().eq("email", email); await admin.auth.admin.deleteUser(data.user.id);
}
