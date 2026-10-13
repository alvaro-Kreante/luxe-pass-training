import { setPage, open, shot, login, step, dump, admin, BASE } from "./lib.mjs";
const email = process.argv[2];
const { browser, page, log } = await open(); setPage(page);
await login(page, email);
await step("F5.1 cancelar desde /my-pass (pagada, >24h)", async () => {
  await page.goto(BASE + "/my-pass", { waitUntil: "load" }); await page.waitForTimeout(3000);
  const card = page.getByRole("listitem").filter({ hasText: /October 26/ }).first();
  await card.getByRole("button", { name: "Cancel" }).click(); await page.waitForTimeout(1200);
  await shot(page, "f5-cancel-modal");
  const modal = (await page.getByRole("dialog").innerText()).replace(/\s+/g, " ").slice(0, 300);
  const confirm = page.getByRole("dialog").getByRole("button", { name: /Cancel booking|Cancel and pay/i });
  await confirm.dblclick(); await page.waitForTimeout(6000);
  await shot(page, "f5-cancelled");
  const { data: b } = await admin.from("bookings").select("id,status,cancellation_fee_cents").eq("id", "6953765f-44e3-41af-8132-117c7e410ad7").single();
  const { data: p } = await admin.from("payments").select("status,refunded_amount_cents").eq("booking_id", b.id).single();
  return `modal="${modal}" booking=${JSON.stringify(b)} payment=${JSON.stringify(p)}`;
});
dump("f5", log); await browser.close();
