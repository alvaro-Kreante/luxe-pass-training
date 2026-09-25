import { beforeEach, describe, expect, it, vi } from "vitest";

import JoinPage from "./page";

/**
 * Story 9.2 — el enlace que comparte el miembro (`Share.dc.html`,
 * "luxepass.co/join/AR-SOLEIL-24"). Sin pantalla propia (decisión de
 * producto, 23 sept 2026): lleva al alta con el código en `?ref=`, que el
 * signup guarda en los metadatos de Auth.
 */
const redirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

beforeEach(() => redirect.mockReset());

describe("/join/[code]", () => {
  it("lleva al alta con el código normalizado", async () => {
    await JoinPage({ params: Promise.resolve({ code: "ar-soleil-24" }) });

    expect(redirect).toHaveBeenCalledWith("/signup?ref=AR-SOLEIL-24");
  });

  it("un código sin forma de código lleva al alta sin él", async () => {
    await JoinPage({ params: Promise.resolve({ code: "hola" }) });

    expect(redirect).toHaveBeenCalledWith("/signup");
  });
});
