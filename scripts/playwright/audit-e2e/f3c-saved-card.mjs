import { setPage, open, shot, login, step, dump, admin, BASE } from "./lib.mjs";
const email = process.argv[2];
const { browser, page, log } = await open(); setPage(page);
await login(page, email);
const { data: u } = await admin.from("profiles").select("id").limit(0);
async function pickSlot(day) {
  await page.goto(BASE + "/lounges/the-ainsworth/book", { waitUntil: "load" });
  await page.getByRole("button", { name: String(day), exact: true }).first().click();
  await page.getByRole("button", { name: /^\d{1,2}:\d{2} (AM|PM) ·/ }).first().click();
  await page.getByRole("link", { name: "Choose payment method" }).click();
  await page.waitForURL("**/book/payment");
}
await step("F3.6b tarjeta guardada visible + doble click", async () => {
  await pickSlot(28);
  await page.waitForTimeout(6000);
  const radios = await page.getByRole("radio").allInnerTexts();
  await shot(page, "f3-saved-cards-after-wait");
  await page.getByRole("radio").filter({ hasText: /4242/ }).first().click();
  await page.getByRole("link", { name: "Review and confirm" }).click();
  await page.waitForURL("**/book/summary");
  await page.waitForTimeout(1500);
  const cb = page.getByRole("checkbox", { name: /accept the booking terms/ });
  if (!(await cb.isChecked())) await cb.click({ force: true });
  await page.getByRole("button", { name: /Confirm and pay/ }).dblclick();
  await page.waitForTimeout(12000);
  await shot(page, "f3-saved-card-dblclick");
  return `radios=${JSON.stringify(radios.map(r => r.split("\n")[0]))} url=${page.url()}`;
});
dump("f3c", log); await browser.close();
