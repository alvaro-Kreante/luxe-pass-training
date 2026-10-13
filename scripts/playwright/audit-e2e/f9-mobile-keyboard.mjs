import { setPage, open, shot, login, step, dump, member, BASE, PW } from "./lib.mjs";
const mm = await member("mobile");
const M = await open({ width: 390, height: 844 }); setPage(M.page);
const overflow = (p) => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
await step("F9.1 390px sin sesión", async () => {
  const out = [];
  for (const r of ["/login", "/signup", "/reception"]) { await M.page.goto(BASE + r, { waitUntil: "load" }); await M.page.waitForTimeout(1500); await shot(M.page, "m390" + r.replace(/\//g, "-")); const o = await overflow(M.page); out.push(`${r}:${o.sw}/${o.cw}`); }
  return out.join(" ");
});
await step("F9.2 390px con sesión", async () => {
  await login(M.page, mm.email);
  const out = [];
  for (const r of ["/", "/explore", "/lounges/the-ainsworth", "/lounges/the-ainsworth/book", "/my-pass", "/profile", "/profile/membership/plans"]) {
    await M.page.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 60000 }); await M.page.waitForTimeout(3500);
    await shot(M.page, "m390" + (r === "/" ? "-home" : r.replace(/\//g, "-"))); const o = await overflow(M.page); out.push(`${r}:${o.sw}/${o.cw}`);
  }
  return out.join(" ");
});
const K = await open(); setPage(K.page);
const tabWalk = async (p, n) => { const seq = []; for (let i = 0; i < n; i++) { await p.keyboard.press("Tab"); seq.push(await p.evaluate(() => { const e = document.activeElement; return `${e.tagName.toLowerCase()}${e.type ? ":" + e.type : ""}[${(e.getAttribute("aria-label") || e.labels?.[0]?.innerText || e.innerText || "").trim().slice(0, 25)}]`; })); } return seq; };
await step("F9.3 teclado /login (tab + Enter)", async () => {
  await K.page.goto(BASE + "/login", { waitUntil: "load" }); await K.page.waitForTimeout(1500);
  const seq = await tabWalk(K.page, 8);
  await K.page.goto(BASE + "/login", { waitUntil: "load" }); await K.page.waitForTimeout(1000);
  await K.page.getByLabel(/Email/i).first().focus(); await K.page.keyboard.type(mm.email); await K.page.keyboard.press("Tab"); await K.page.keyboard.type(PW); await K.page.keyboard.press("Enter");
  await K.page.waitForURL((u) => !u.pathname.endsWith("login"), { timeout: 30000 });
  return `tabs=${seq.join(" > ")} ; enter-submit-> ${K.page.url().replace(BASE, "")}`;
});
await step("F9.4 teclado /signup (checkbox con Space)", async () => {
  const X = await open();
  await X.page.goto(BASE + "/signup", { waitUntil: "load" }); await X.page.waitForTimeout(1500);
  const seq = await tabWalk(X.page, 9);
  const cb = X.page.getByRole("checkbox").first(); await cb.focus(); await X.page.keyboard.press("Space");
  const checked = await cb.isChecked(); await X.browser.close();
  return `tabs=${seq.join(" > ")} ; spaceChecks=${checked}`;
});
await step("F9.5 teclado reserva paso 1 (calendario/slots)", async () => {
  await K.page.goto(BASE + "/lounges/the-ainsworth/book", { waitUntil: "load" }); await K.page.waitForTimeout(2500);
  const seq = await tabWalk(K.page, 25);
  await shot(K.page, "f9-kbd-book-focus");
  return seq.join(" > ");
});
dump("f9", { mobile: M.log, kbd: K.log }); await M.browser.close(); await K.browser.close();
