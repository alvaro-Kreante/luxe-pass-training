import { setPage, open, shot, login, step, dump, member, admin, BASE, PW } from "./lib.mjs";
const text = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 220);
// partner
const pEmail = `e2e-partner-${Date.now()}@example.com`;
const { data: l } = await admin.from("lounges").select("partner_id").eq("id", "the-ainsworth").single();
let partnerId = l.partner_id;
if (!partnerId) throw new Error("the-ainsworth sin partner (seed-partners no corrido)");
await admin.from("partner_members").insert({ partner_id: partnerId, first_name: "E2E", last_name: "Partner", email: pEmail });
const { data: pu } = await admin.auth.admin.createUser({ email: pEmail, password: PW, email_confirm: true });
await admin.from("user_roles").insert({ user_id: pu.user.id, role: "partner" });
await admin.from("partner_members").update({ user_id: pu.user.id }).eq("email", pEmail);
const P = await open(); setPage(P.page);
await step("F7.1 partner login + dashboard", async () => {
  await login(P.page, pEmail, PW, "/partner/login");
  await P.page.waitForTimeout(4000); await shot(P.page, "f7-partner-dashboard");
  return `url=${P.page.url()} text=${await text(P.page)}`;
});
await step("F7.2 partner: guests / analytics", async () => {
  await P.page.goto(BASE + "/partner/guests", { waitUntil: "load" }); await P.page.waitForTimeout(3000); await shot(P.page, "f7-partner-guests");
  const g = await text(P.page);
  await P.page.goto(BASE + "/partner/analytics", { waitUntil: "load" }); await P.page.waitForTimeout(3000); await shot(P.page, "f7-partner-analytics");
  return `guests=${g}`;
});
await step("F7.3 partner intenta /admin", async () => {
  await P.page.goto(BASE + "/admin/members", { waitUntil: "load" }); await P.page.waitForTimeout(3000); await shot(P.page, "f7-partner-to-admin");
  return `url=${P.page.url()} text=${await text(P.page)}`;
});
// admin
const aEmail = `e2e-admin-${Date.now()}@example.com`;
const { data: au } = await admin.auth.admin.createUser({ email: aEmail, password: PW, email_confirm: true });
await admin.from("user_roles").insert({ user_id: au.user.id, role: "admin" });
const A = await open(); setPage(A.page);
await step("F8.1 admin login + members/partners/lounges/support", async () => {
  await login(A.page, aEmail, PW, "/admin/login"); await A.page.waitForTimeout(3000);
  const out = [];
  for (const r of ["/admin/members", "/admin/partners", "/admin/lounges", "/admin/support", "/admin/analytics", "/admin/reports"]) {
    const res = await A.page.goto(BASE + r, { waitUntil: "load" }); await A.page.waitForTimeout(2500);
    await shot(A.page, "f8" + r.replace(/\//g, "-"));
    out.push(`${r}:${res.status()}:${A.page.url().replace(BASE, "")}`);
  }
  return out.join(" ");
});
// miembro sin rol
const mm = await member("norole");
const M = await open(); setPage(M.page);
await step("F8.2 miembro normal intenta /admin y /partner", async () => {
  await login(M.page, mm.email);
  await M.page.goto(BASE + "/admin/members", { waitUntil: "load" }); await M.page.waitForTimeout(3000); await shot(M.page, "f8-member-to-admin");
  const a = `${M.page.url().replace(BASE, "")} ${await text(M.page)}`;
  await M.page.goto(BASE + "/partner", { waitUntil: "load" }); await M.page.waitForTimeout(3000); await shot(M.page, "f8-member-to-partner");
  return `admin-> ${a} || partner-> ${M.page.url().replace(BASE, "")} ${await text(M.page)}`;
});
await step("F8.3 anónimo /admin y /partner", async () => {
  const X = await open();
  await X.page.goto(BASE + "/admin/members", { waitUntil: "load" }); await X.page.waitForTimeout(2500);
  const a = X.page.url().replace(BASE, "");
  await X.page.goto(BASE + "/partner/guests", { waitUntil: "load" }); await X.page.waitForTimeout(2500);
  const b = X.page.url().replace(BASE, "");
  await X.page.goto(BASE + "/my-pass", { waitUntil: "load" }); await X.page.waitForTimeout(2500);
  const c = X.page.url().replace(BASE, ""); await shot(X.page, "f8-anon-mypass");
  await X.browser.close();
  return `admin->${a} partner->${b} my-pass->${c}`;
});
dump("f7-f8", { partner: P.log, admin: A.log, member: M.log });
for (const x of [P, A, M]) await x.browser.close();
