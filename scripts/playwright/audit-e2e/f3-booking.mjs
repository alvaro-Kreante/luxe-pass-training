import { setPage, open, shot, login, step, dump, member, admin, BASE } from "./lib.mjs";
const m = await member("book");
const { browser, page, log } = await open(); setPage(page);
await login(page, m.email);
async function pickSlot(day) {
  await page.goto(BASE + "/lounges/the-ainsworth/book", { waitUntil: "load" });
  await page.getByRole("button", { name: String(day), exact: true }).first().click();
  await page.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM) ·/ }).first().click();
  await page.getByRole("link", { name: "Choose payment method" }).click();
  await page.waitForURL("**/book/payment");
}
async function newCard(num, save) {
  await page.getByRole("radio", { name: /Use a new card/ }).click();
  await page.waitForTimeout(2500);
  const f = page.frameLocator('iframe[title="Secure payment input frame"]').first();
  await f.getByText("Card", { exact: true }).click().catch(() => {});
  await page.waitForTimeout(800);
  await f.getByRole("textbox", { name: /Card number/i }).fill(num);
  await f.getByRole("textbox", { name: /Expiration date/i }).fill("12/34");
  await f.getByRole("textbox", { name: /Security code/i }).fill("123");
  const c = f.locator("#payment-countryInput"); if (await c.count()) await c.selectOption("US");
  const z = f.getByRole("textbox", { name: /ZIP|postal/i }); if (await z.count()) await z.fill("10017");
  if (save) await page.getByRole("checkbox", { name: /Save/i }).check({ force: true }).catch(() => {});
}
async function toSummary() {
  await page.getByRole("link", { name: "Review and confirm" }).click();
  await page.waitForURL("**/book/summary");
  await page.waitForTimeout(1500);
  const cb = page.getByRole("checkbox", { name: /accept the booking terms/ });
  if (!(await cb.isChecked())) await cb.click({ force: true });
}
const counts = async () => {
  const p = await admin.from("payments").select("status,booking_id,amount_cents").eq("member_id", m.id);
  const b = await admin.from("bookings").select("id,status,date").eq("member_id", m.id);
  return { payments: p.data, bookings: b.data };
};
if (!process.env.SKIP31) await step("F3.1 pago OK 4242 (guardar tarjeta)", async () => {
  await pickSlot(20); await newCard("4242424242424242", true); await toSummary();
  await shot(page, "f3-summary");
  const nav = []; page.on("framenavigated", (f) => { if (f === page.mainFrame()) nav.push(f.url()); });
  await page.getByRole("button", { name: /Confirm and pay/ }).click();
  await page.waitForURL("**/book/confirmed", { timeout: 40000 }).catch(async (e) => { await shot(page, "f3-confirm-stuck"); throw new Error("no /confirmed; navs=" + nav.join(" > ") + " db=" + JSON.stringify(await counts())); });
  await shot(page, "f3-confirmed");
  await page.waitForTimeout(8000);
  return JSON.stringify(await counts());
});
if (!process.env.SKIP31) await step("F3.2 tarjeta rechazada 4000..0002", async () => {
  await pickSlot(21); await newCard("4000000000000002", false); await toSummary();
  await page.getByRole("button", { name: /Confirm and pay/ }).click();
  await page.waitForTimeout(8000);
  await shot(page, "f3-declined");
  const dlg = await page.getByRole("dialog").allInnerTexts();
  return `url=${page.url()} dialog=${dlg.join(" ").slice(0, 200).replace(/\n/g, " ")} db=${JSON.stringify(await counts())}`;
});
await step("F3.3 doble click en pagar (tarjeta nueva 4242)", async () => {
  await pickSlot(22);
  const radios = await page.getByRole("radio").allInnerTexts().catch(() => []);
  await newCard("4242424242424242", false);
  await toSummary();
  await page.getByRole("button", { name: /Confirm and pay/ }).dblclick();
  await page.waitForTimeout(10000);
  await shot(page, "f3-doubleclick");
  return `url=${page.url()} radios=${radios.length} db=${JSON.stringify(await counts())}`;
});
await step("F3.4 recarga a mitad del flujo (payment y summary)", async () => {
  await pickSlot(23);
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
  const afterPayReload = page.url();
  await shot(page, "f3-reload-payment");
  await pickSlot(23); await page.getByRole("radio").first().click(); await toSummary();
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1500);
  await shot(page, "f3-reload-summary");
  return `payment reload -> ${afterPayReload} ; summary reload -> ${page.url()}`;
});
await step("F3.5 botón atrás tras confirmar", async () => {
  const before = (await counts()).bookings.length;
  await pickSlot(24); await newCard("4242424242424242", false); await toSummary();
  await page.getByRole("button", { name: /Confirm and pay/ }).click();
  await page.waitForURL("**/book/confirmed", { timeout: 30000 });
  await page.goBack({ waitUntil: "load" }); await page.waitForTimeout(2000);
  await shot(page, "f3-back-after-confirm");
  const url = page.url();
  const btn = page.getByRole("button", { name: /Confirm and pay/ });
  let again = "no button";
  if (await btn.count() && await btn.isEnabled()) { await btn.click(); await page.waitForTimeout(8000); again = "clicked again -> " + page.url(); }
  const after = (await counts()).bookings.length;
  return `back -> ${url}; ${again}; bookings ${before} -> ${after}`;
});
await step("F3.6 guardar tarjeta: marcar 'Save' antes de elegir tarjeta nueva", async () => {
  await pickSlot(26);
  await page.getByRole("checkbox", { name: /Save this card/i }).click({ force: true });
  const checked = await page.getByRole("checkbox", { name: /Save this card/i }).isChecked();
  await newCard("4242424242424242", false); await toSummary();
  await page.getByRole("button", { name: /Confirm and pay/ }).click();
  await page.waitForURL("**/book/confirmed", { timeout: 40000 });
  await page.waitForTimeout(5000);
  await pickSlot(27);
  const radios = await page.getByRole("radio").allInnerTexts();
  await shot(page, "f3-saved-cards");
  return `saveChecked=${checked} radiosAfter=${JSON.stringify(radios)}`;
});
dump("f3", log); console.log(JSON.stringify(log, null, 1).slice(0, 3000));
await browser.close();
