import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import fs from "node:fs";
import { env, root, BASE } from "./env.mjs";
export { env, BASE };
export const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
export const SHOTS = path.join(root, "scripts/playwright/audit-e2e/screenshots");
export const PW = "EnSoleil!2026";
export async function member(prefix, profile = true) {
  const email = `e2e-${prefix}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw error;
  if (profile) await admin.from("profiles").insert({ id: data.user.id, full_name: "E2E Audit", phone: "+15555550100", city: "New York", industry: "Testing", terms_accepted_at: new Date().toISOString() });
  return { email, id: data.user.id };
}
export async function open(viewport = { width: 1440, height: 900 }) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport, permissions: ["geolocation"], geolocation: { latitude: 40.7549, longitude: -73.9840 } });
  const page = await ctx.newPage();
  const log = { console: [], failed: [] };
  page.on("console", (m) => { if (m.type() === "error") log.console.push(`${page.url()} :: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => log.console.push(`${page.url()} :: PAGEERROR ${e.message.slice(0, 300)}`));
  page.on("requestfailed", (r) => { const u = r.url(); if (!/_next\/webpack-hmr|google|stripe\.com|r\.stripe/.test(u)) log.failed.push(`${r.method()} ${u.slice(0, 160)} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !/stripe\.com|google/.test(r.url())) log.failed.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 160)}`); });
  return { browser, ctx, page, log };
}
export const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
export async function login(page, email, pw = PW, route = "/login") {
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.getByLabel(/Email/i).first().fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(pw);
  await page.getByRole("button", { name: /Log in|Sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("login"), { timeout: 45000 });
  await page.waitForLoadState("load"); await page.waitForTimeout(2500);
}
export const results = [];
export let curPage = null; export const setPage = (p) => { curPage = p; };
export async function step(id, fn) {
  try { const obs = await fn(); results.push({ id, status: "PASS", obs }); console.log("PASS", id, obs ?? ""); }
  catch (e) { if (curPage) await curPage.screenshot({ path: path.join(SHOTS, `FAIL-${id.split(" ")[0]}.png`) }).catch(() => {}); results.push({ id, status: "FAIL", obs: e.message.split("\n")[0] }); console.log("FAIL", id, e.message.split("\n").slice(0, 3).join(" | ")); }
}
export function dump(name, log) { fs.writeFileSync(path.join(SHOTS, `${name}-log.json`), JSON.stringify({ results, log }, null, 2)); }
