// PERF-02 — guard de servidor de /partner/analytics: miembro sin rol y partner suspendido.
// node scripts/playwright/perf-02/check-partner-guard.mjs (con `next start -p 3026`)
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {}; for (const l of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ""); }
if (!/^http:\/\/127\.0\.0\.1:54331/.test(env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error("NOT LOCAL");
const BASE = process.env.BASE ?? "http://localhost:3026", PW = "EnSoleil!2026";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stamp = Date.now();
const memberEmail = `perf02-notpartner-${stamp}@example.com`, partnerEmail = `perf02-suspended-${stamp}@example.com`;
const { data: m } = await admin.auth.admin.createUser({ email: memberEmail, password: PW, email_confirm: true });
await admin.from("profiles").insert({ id: m.user.id, full_name: "Not Partner", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
const partnerId = (await admin.from("lounges").select("partner_id").not("partner_id", "is", null).limit(1).single()).data.partner_id;
await admin.from("partner_members").insert({ partner_id: partnerId, first_name: "Perf", last_name: "Suspended", email: partnerEmail });
const { data: p } = await admin.auth.admin.createUser({ email: partnerEmail, password: PW, email_confirm: true });
await admin.from("partner_members").update({ user_id: p.user.id }).eq("email", partnerEmail);
await admin.from("user_roles").insert({ user_id: p.user.id, role: "partner" });
const browser = await chromium.launch({ headless: true });
try {
  const memberPage = await (await browser.newContext({ serviceWorkers: "block" })).newPage();
  await memberPage.goto(BASE + "/login"); await memberPage.getByLabel("Email address").fill(memberEmail); await memberPage.getByLabel("Password", { exact: true }).fill(PW);
  await memberPage.getByRole("button", { name: "Log in" }).click(); await memberPage.waitForURL((u) => !u.pathname.endsWith("login"));
  await memberPage.goto(BASE + "/partner/analytics");
  console.log("miembro sin rol ->", new URL(memberPage.url()).pathname, "| ve datos:", await memberPage.getByText("How things are going").count() > 0);

  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const partnerPage = await ctx.newPage();
  await partnerPage.goto(BASE + "/partner/login"); await partnerPage.getByLabel(/Email/i).first().fill(partnerEmail); await partnerPage.getByRole("textbox", { name: "Password" }).fill(PW);
  await partnerPage.getByRole("button", { name: /Sign in/i }).click(); await partnerPage.waitForURL((u) => !u.pathname.endsWith("login"));
  await admin.from("partner_members").update({ suspended_at: new Date().toISOString() }).eq("email", partnerEmail);
  await partnerPage.goto(BASE + "/partner/analytics"); await partnerPage.waitForTimeout(2500);
  const url = new URL(partnerPage.url());
  const cookies = (await ctx.cookies()).filter((c) => c.name.includes("auth-token"));
  console.log("partner suspendido ->", url.pathname + url.search, "| mensaje:", await partnerPage.getByText(/suspended/i).first().isVisible(), "| cookies de sesión:", cookies.length);
} finally {
  await browser.close();
  await admin.from("partner_members").delete().eq("email", partnerEmail);
  await admin.auth.admin.deleteUser(m.user.id); await admin.auth.admin.deleteUser(p.user.id);
}
