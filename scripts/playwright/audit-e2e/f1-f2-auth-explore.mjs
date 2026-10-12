import { setPage, open, shot, login, step, dump, member, BASE, PW, env, results } from "./lib.mjs";
import { createClient } from "@supabase/supabase-js";
const { browser, page, log } = await open(); setPage(page);
// 1a signup UI
const email = `e2e-signup-${Date.now()}@example.com`;
await step("F1.1 signup form", async () => {
  await page.goto(BASE + "/signup", { waitUntil: "load" });
  await shot(page, "f1-signup-empty");
  const disabledBefore = await page.getByRole("button", { name: /create account/i }).isDisabled();
  await page.getByLabel(/Email/i).first().fill("not-an-email");
  await page.locator('input[type="password"]').first().fill("short");
  await page.getByText("I have read and agree").click();
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForTimeout(800);
  await shot(page, "f1-signup-validation");
  const valMsgs = (await page.locator("form").innerText()).replace(/\s+/g," ").slice(0,400);
  const inputs = await page.locator("input").evaluateAll(els => els.map(e => `${e.type}:${e.getAttribute("aria-label")||e.id||e.name}`));
  for (const lab of await page.locator("label").allInnerTexts()) {}
  await page.getByLabel(/Email/i).first().fill(email);
  const pws = page.locator('input[type="password"]');
  for (let i = 0; i < await pws.count(); i++) await pws.nth(i).fill(PW);
    await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForTimeout(4000);
  await shot(page, "f1-signup-submitted");
  return `disabledBeforeTerms=${disabledBefore} validation="${valMsgs}" url=${page.url()} body=${(await page.locator("body").innerText()).slice(0,160).replace(/\s+/g," ")}`;
});
await page.context().clearCookies();
// 1b login wrong + lockout
const m = await member("login");
await step("F1.2 login wrong pw + lockout", async () => {
  const msgs = [];
  for (let i = 0; i < 6; i++) {
    await page.goto(BASE + "/login", { waitUntil: "load" });
    await page.getByLabel(/Email/i).first().fill(m.email);
    await page.getByRole("textbox", { name: "Password" }).fill("WrongPass!1");
    await page.getByRole("button", { name: /Log in/i }).click();
    await page.waitForTimeout(2000);
    msgs.push((await page.locator('[role="alert"], p').filter({ hasText: /attempt|locked|incorrect|invalid/i }).allInnerTexts()).join(" / "));
  }
  await shot(page, "f1-login-locked");
  return msgs.map((t, i) => `#${i + 1}: ${t}`).join(" || ");
});
await step("F1.3 lockout bypass: anon reset_login_attempts + direct GoTrue", async () => {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const before = (await anon.rpc("check_login_lock", { p_email: m.email })).data?.[0];
  const direct = await anon.auth.signInWithPassword({ email: m.email, password: PW });
  await anon.auth.signOut();
  const r = await anon.rpc("reset_login_attempts", { p_email: m.email });
  const after = (await anon.rpc("check_login_lock", { p_email: m.email })).data?.[0];
  return `lockedBefore=${before?.locked} directSignInWhileLocked=${direct.error ? "ERR " + direct.error.message : "OK(session)"} anonReset=${r.error ? r.error.message : "OK"} lockedAfter=${after?.locked}`;
});
await step("F1.4 anon can lock victim (record_failed_login x5)", async () => {
  const v = await member("victim");
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  let last; for (let i = 0; i < 5; i++) last = await anon.rpc("record_failed_login", { p_email: v.email });
  const after = (await anon.rpc("check_login_lock", { p_email: v.email })).data?.[0];
  await anon.rpc("reset_login_attempts", { p_email: v.email });
  return `victimLocked=${after?.locked} (${JSON.stringify(last.data ?? last.error?.message)})`;
});
await step("F1.5 login happy path", async () => { await login(page, m.email); await shot(page, "f1-login-ok"); return page.url(); });
// 2 explore
await step("F2.1 explore + search", async () => {
  await page.goto(BASE + "/explore", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  await shot(page, "f2-explore");
  const allow = page.getByRole("button", { name: /Allow location access/i }); if (await allow.count()) { await allow.click(); await page.waitForTimeout(2000); }
  const sb = page.getByRole("searchbox").or(page.getByPlaceholder(/search/i)).first();
  await sb.fill("Ainsworth"); await page.waitForTimeout(1500);
  await shot(page, "f2-explore-search");
  await sb.fill("zzzzqqq-nothing"); await page.waitForTimeout(1500);
  await shot(page, "f2-explore-search-empty");
  return (await page.locator("main").innerText()).slice(0, 200).replace(/\n/g, " ");
});
await step("F2.2 lounge detail", async () => {
  const r = await page.goto(BASE + "/lounges/the-ainsworth", { waitUntil: "load" });
  await shot(page, "f2-lounge-detail");
  return `status=${r.status()}`;
});
await step("F2.3 lounge inexistente", async () => {
  const r = await page.goto(BASE + "/lounges/does-not-exist-xyz", { waitUntil: "load" });
  await shot(page, "f2-lounge-404");
  return `status=${r.status()} text=${(await page.locator("body").innerText()).slice(0, 120).replace(/\n/g, " ")}`;
});
await step("F2.4 explore ?map=error", async () => { await page.goto(BASE + "/explore?map=error", { waitUntil: "domcontentloaded", timeout: 60000 }); await shot(page, "f2-explore-maperror"); });
dump("f1-f2", log); await browser.close();
