// Comprobaciones manuales de a11y: errores de formulario, foco visible, trampas de foco en Radix,
// prefers-reduced-motion. Reutiliza las sesiones de measure.mjs (.storage.json). next start -p 3006.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3006";
const S = JSON.parse(fs.readFileSync(path.join(dir, ".storage.json"), "utf8"));
const OUT = path.join(dir, "screenshots"); const res = {};
const browser = await chromium.launch({ headless: true });
async function pg(storage, vp = { width: 1440, height: 900 }, extra = {}) { const c = await browser.newContext({ viewport: vp, storageState: storage, ...extra }); return c.newPage(); }
const focusInfo = (p) => p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e);
  return { tag: e.tagName, name: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30), inDialog: !!e.closest("[role=dialog],[role=alertdialog]"),
    ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 || /rgb|#/.test(cs.boxShadow) && cs.boxShadow !== "none" }; });

// 1. Errores de formulario (login + signup)
{ const p = await pg(undefined);
  await p.goto(BASE + "/login"); await p.getByRole("button", { name: /Log in/i }).click(); await p.waitForTimeout(800);
  res.loginEmpty = await p.evaluate(() => [...document.querySelectorAll("input")].map(i => ({ id: i.id, type: i.type, invalid: i.getAttribute("aria-invalid"), describedby: i.getAttribute("aria-describedby"), required: i.required || i.getAttribute("aria-required") })));
  res.loginEmptyAlerts = await p.evaluate(() => [...document.querySelectorAll("[role=alert],[aria-live]")].map(e => e.outerHTML.slice(0, 160)));
  await p.getByLabel(/Email/i).first().fill("nobody-perfa11y@example.com"); await p.getByRole("textbox", { name: "Password" }).fill("WrongPass!1");
  await p.getByRole("button", { name: /Log in/i }).click(); await p.waitForTimeout(3000);
  res.loginWrong = await p.evaluate(() => ({ alerts: [...document.querySelectorAll("[role=alert],[aria-live],[role=status]")].map(e => (e.getAttribute("role") || e.getAttribute("aria-live")) + ":" + e.textContent.trim().slice(0, 80)), inputs: [...document.querySelectorAll("input")].map(i => i.id + " inv=" + i.getAttribute("aria-invalid") + " desc=" + i.getAttribute("aria-describedby")) }));
  await p.screenshot({ path: path.join(OUT, "a11y-login-error.png") });
  await p.goto(BASE + "/signup"); await p.getByRole("button", { name: /Create account|Sign up|Continue/i }).last().click().catch(() => {}); await p.waitForTimeout(800);
  res.signupEmpty = await p.evaluate(() => [...document.querySelectorAll("input")].map(i => i.id + " inv=" + i.getAttribute("aria-invalid") + " desc=" + i.getAttribute("aria-describedby") + " descText=" + (i.getAttribute("aria-describedby") || "").split(" ").map(id => document.getElementById(id)?.textContent?.trim().slice(0, 40)).join("|")));
  await p.screenshot({ path: path.join(OUT, "a11y-signup-errors.png"), fullPage: true });
  // Radix dialog (Terms) — trampa de foco y retorno
  await p.goto(BASE + "/signup"); const terms = p.getByRole("link", { name: /Terms of Service/i }).or(p.getByRole("button", { name: /Terms of Service/i })).first();
  await terms.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(800);
  const seq = []; for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); seq.push(await focusInfo(p)); }
  res.termsDialog = { open: await p.locator("[role=dialog]").count(), allInside: seq.every(s => s.inDialog), noRing: seq.filter(s => !s.ring).map(s => s.name) };
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  res.termsDialog.afterEsc = { dialogs: await p.locator("[role=dialog]").count(), focus: await focusInfo(p) };
  await p.context().close(); }

// 2. Foco visible (Tab x25) claro y oscuro
for (const [k, st, route] of [["member-explore", S.mem, "/explore"], ["member-lounge", S.mem, "/lounges/the-ainsworth"], ["partner", S.par, "/partner"], ["admin-members", S.adm, "/admin/members"]]) {
  const p = await pg(st); await p.goto(BASE + route); await p.waitForTimeout(3500);
  const seq = []; for (let i = 0; i < 25; i++) { await p.keyboard.press("Tab"); seq.push(await focusInfo(p)); }
  res["focus-" + k] = { total: seq.length, withoutRing: seq.filter(s => !s.ring && s.tag !== "BODY").map(s => `${s.tag}:${s.name}`), first: seq[0] };
  await p.screenshot({ path: path.join(OUT, `a11y-focus-${k}.png`) });
  await p.context().close();
}

// 3. Menús / drawers Radix (partner y admin, desktop y móvil)
for (const [k, st, route, vp] of [["partner-desktop", S.par, "/partner", { width: 1440, height: 900 }], ["partner-390", S.par, "/partner", { width: 390, height: 844 }], ["admin-390", S.adm, "/admin/members", { width: 390, height: 844 }], ["member-390", S.mem, "/my-pass", { width: 390, height: 844 }]]) {
  const p = await pg(st, vp); await p.goto(BASE + route); await p.waitForTimeout(3500);
  const triggers = await p.locator("button[aria-haspopup], button[aria-expanded]").evaluateAll(els => els.filter(e => e.getBoundingClientRect().width > 0).map(e => (e.getAttribute("aria-label") || e.textContent).trim().slice(0, 30)));
  const out = { triggers };
  const t = p.locator("button[aria-haspopup], button[aria-expanded]").filter({ visible: true }).first();
  if (await t.count()) {
    await t.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(600);
    out.opened = await p.evaluate(() => [...document.querySelectorAll("[role=menu],[role=dialog],[role=listbox]")].map(e => e.getAttribute("role")));
    out.focusAfterOpen = await focusInfo(p);
    const seq = []; for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); seq.push(await focusInfo(p)); } out.tabSeq = seq.map(s => s.name + (s.inDialog ? "[in]" : ""));
    await p.keyboard.press("Escape"); await p.waitForTimeout(400); out.afterEsc = await focusInfo(p);
    await p.screenshot({ path: path.join(OUT, `a11y-menu-${k}.png`) });
  }
  res["menu-" + k] = out; await p.context().close();
}

// 4. prefers-reduced-motion
{ const p = await pg(S.mem, { width: 390, height: 844 }, { reducedMotion: "reduce" }); await p.goto(BASE + "/explore"); await p.waitForTimeout(3500);
  res.reducedMotion = await p.evaluate(() => { const all = [...document.querySelectorAll("*")];
    return { withTransition: all.filter(e => parseFloat(getComputedStyle(e).transitionDuration) > 0).length, withAnimation: all.filter(e => getComputedStyle(e).animationName !== "none").map(e => e.className.toString().slice(0, 40)).slice(0, 5),
      smoothScroll: getComputedStyle(document.documentElement).scrollBehavior }; });
  await p.context().close(); }
await browser.close();
fs.writeFileSync(path.join(OUT, "a11y-interact.json"), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 1));
