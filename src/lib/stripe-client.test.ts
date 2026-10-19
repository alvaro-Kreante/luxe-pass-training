import { describe, expect, it } from "vitest";

/**
 * PERF-11 — Stripe.js (~289 KB) solo se descarga cuando hay un pago que
 * montar (`getStripe()`), no por importar el módulo: `/book` paso 1 y
 * `/profile` lo importan sin llegar a cobrar.
 */

function stripeScripts() {
  return document.querySelectorAll('script[src^="https://js.stripe.com"]');
}

describe("getStripe", () => {
  it("importar el cliente no descarga Stripe.js", async () => {
    await import("./stripe-client");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stripeScripts()).toHaveLength(0);
  });

  it("pedir Stripe descarga Stripe.js una sola vez", async () => {
    const { getStripe } = await import("./stripe-client");

    void getStripe().catch(() => undefined);
    void getStripe().catch(() => undefined);

    expect(stripeScripts()).toHaveLength(1);
  });
});
