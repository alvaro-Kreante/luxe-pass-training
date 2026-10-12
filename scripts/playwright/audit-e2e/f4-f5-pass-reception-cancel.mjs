import { setPage, open, shot, login, step, dump, admin, BASE } from "./lib.mjs";
const email = process.argv[2];
const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
const uid = users.users.find(u => u.email === email).id;
const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const mk = async (band, slot) => (await admin.from("bookings").insert({ member_id: uid, lounge_id: "the-ainsworth", date: todayIso, band, slot_time: slot, status: "confirmed" }).select("id,confirmation_code").single()).data;
const b1 = await mk("afternoon", "3:30 PM"), b2 = await mk("evening", "6:00 PM");
console.log("today", todayIso, b1.confirmation_code, b2.confirmation_code);
const m = await open(); setPage(m.page);
await login(m.page, email);
await step("F4.1 my-pass lista + QR", async () => {
  await m.page.goto(BASE + "/my-pass", { waitUntil: "load" }); await m.page.waitForTimeout(3000);
  await shot(m.page, "f4-my-pass-list");
  await m.page.goto(BASE + "/my-pass/" + b1.confirmation_code, { waitUntil: "load" }); await m.page.waitForTimeout(3000);
  await shot(m.page, "f4-my-pass-qr");
  const qr = await m.page.locator("svg, canvas, img").filter({ has: m.page.locator("path, rect") }).count();
  const txt = (await m.page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 200);
  return `qrLikeElements=${qr} text=${txt}`;
});
await step("F4.2 my-pass referencia ajena/inexistente", async () => {
  const r = await m.page.goto(BASE + "/my-pass/LP-000001", { waitUntil: "load" }); await m.page.waitForTimeout(2500);
  await shot(m.page, "f4-my-pass-unknown");
  return `status=${r.status()} text=${(await m.page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 150)}`;
});
if (process.env.ONLY5) { 
  const { data: bk } = await admin.from("bookings").select("id").eq("member_id", uid).eq("date", todayIso); }
// recepción: navegador anónimo
const r = await open({ width: 1280, height: 800 }); setPage(r.page);
await step("F4.3 recepción anónima: lookup + check-in", async () => {
  await r.page.goto(BASE + "/reception", { waitUntil: "load" }); await r.page.waitForTimeout(2000);
  await shot(r.page, "f4-reception-empty");
  const input = r.page.getByRole("textbox").first();
  await input.fill(b1.confirmation_code); await input.press("Enter"); await r.page.waitForTimeout(2500);
  await shot(r.page, "f4-reception-found");
  const found = (await r.page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300);
  await r.page.getByRole("button", { name: /check in|admit|confirm/i }).first().click(); await r.page.waitForTimeout(2500);
  await shot(r.page, "f4-reception-checked-in");
  const db = (await admin.from("bookings").select("status,checked_in_at").eq("id", b1.id).single()).data;
  return `found="${found}" db=${JSON.stringify(db)}`;
});
await step("F4.4 recepción: código inexistente", async () => {
  const input = r.page.getByRole("textbox").first();
  await input.fill("LP-999999"); await input.press("Enter"); await r.page.waitForTimeout(2000);
  await shot(r.page, "f4-reception-notfound");
  return (await r.page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200);
});
await step("F4.5 recepción: no-show", async () => {
  const input = r.page.getByRole("textbox").first();
  await input.fill(b2.confirmation_code); await input.press("Enter"); await r.page.waitForTimeout(2500);
  const btns = await r.page.getByRole("button").allInnerTexts();
  await r.page.getByRole("button", { name: /no.?show/i }).first().click(); await r.page.waitForTimeout(1000);
  const confirm = r.page.getByRole("dialog").getByRole("button", { name: /no.?show|confirm|report/i });
  if (await confirm.count()) await confirm.first().click();
  await r.page.waitForTimeout(2500);
  await shot(r.page, "f4-reception-noshow");
  const db = (await admin.from("bookings").select("status,no_show,cancellation_fee_cents").eq("id", b2.id).single()).data;
  return `buttons=${JSON.stringify(btns)} db=${JSON.stringify(db)}`;
});
await step("F4.6 recepción: check-in repetido", async () => {
  const input = r.page.getByRole("textbox").first();
  await input.fill(b1.confirmation_code); await input.press("Enter"); await r.page.waitForTimeout(2500);
  await shot(r.page, "f4-reception-repeat");
  return (await r.page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 250);
});
await step("F4.7 miembro ve check-in", async () => {
  await m.page.goto(BASE + "/my-pass/" + b1.confirmation_code, { waitUntil: "load" }); await m.page.waitForTimeout(3000);
  await shot(m.page, "f4-my-pass-after-checkin");
  return (await m.page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 200);
});
setPage(m.page);
await step("F5.1 cancelar reserva pagada (>24h)", async () => {
  const { data: bk } = await admin.from("bookings").select("id,confirmation_code,date").eq("member_id", uid).eq("date", "2026-10-24").single();
  await m.page.goto(BASE + "/my-pass/" + bk.confirmation_code, { waitUntil: "load" }); await m.page.waitForTimeout(3000);
  await m.page.getByRole("button", { name: /Cancel visit/i }).click(); await m.page.waitForTimeout(1000);
  const inertDialog = await m.page.getByRole("dialog").count();
  await m.page.goto(BASE + "/my-pass", { waitUntil: "load" }); await m.page.waitForTimeout(3000);
  const cancelBtns = await m.page.getByRole("button", { name: /cancel/i }).evaluateAll(els => els.map(e => e.getAttribute("aria-label") || e.textContent));
  console.log("inertDialogOnPassDetail=", inertDialog, "listCancelButtons=", cancelBtns);
  const row = m.page.locator("li, article, tr, div").filter({ hasText: bk.confirmation_code }).filter({ has: m.page.getByRole("button", { name: /cancel/i }) }).last();
  await row.getByRole("button", { name: /cancel/i }).first().click(); await m.page.waitForTimeout(1000);
  await shot(m.page, "f5-cancel-modal");
  const modal = (await m.page.getByRole("dialog").innerText()).replace(/\s+/g, " ").slice(0, 300);
  await m.page.getByRole("dialog").getByRole("button", { name: /Cancel booking|Cancel and pay/i }).click();
  await m.page.waitForTimeout(8000);
  await shot(m.page, "f5-cancelled");
  const db = (await admin.from("bookings").select("status,cancellation_fee_cents").eq("id", bk.id).single()).data;
  const pay = (await admin.from("payments").select("status,refunded_amount_cents").eq("booking_id", bk.id).maybeSingle());
  return `modal="${modal}" booking=${JSON.stringify(db)} payment=${JSON.stringify(pay.data ?? pay.error?.message)}`;
});
await step("F5.2 cancelar dos veces (reintento RPC)", async () => {
  const { data: bk } = await admin.from("bookings").select("id").eq("member_id", uid).eq("date", "2026-10-24").single();
  const { createClient } = await import("@supabase/supabase-js");
  const { env, PW } = await import("./lib.mjs");
  const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email, password: PW });
  const res = await c.rpc("cancel_booking", { p_booking_id: bk.id, p_today: todayIso });
  return res.error ? "error: " + res.error.message : "ok " + JSON.stringify(res.data).slice(0, 150);
});
dump("f4-f5", { member: m.log, reception: r.log }); await m.browser.close(); await r.browser.close();
