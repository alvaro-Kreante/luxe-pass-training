import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { fetchReceipts, openBillingPortal } from "./billing";
import { chargeSavedPaymentMethod } from "./stripe-payments";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { insertSucceededTestPayment, settleTestPayment } from "./testing/membership-fixture";
import { attachTestCard } from "./testing/stripe-fixture";

/**
 * "Invoices and receipts" (`Receipts.dc.html`) y "Update" de la tarjeta.
 * Los cobros reales no generan facturas de Stripe (PaymentIntents y
 * Checkout en modo `payment`), así que la lista sale de `payments` y cada
 * fila enlaza el recibo del cargo en Stripe (`charge.receipt_url`). La
 * tarjeta se cambia en el Customer Portal de Stripe.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe("fetchReceipts", () => {
  const supabase = createClient();
  let userId: string;

  beforeAll(async () => {
    const user = await signUpConfirmedMemberAndSignIn(
      supabase,
      `billing-receipts-${Date.now()}@ensoleil-test.example`,
      "EnSoleil!2026",
    );
    userId = user.id;
  });

  it("sin cobros, la lista queda vacía", async () => {
    expect((await fetchReceipts(supabase)).receipts).toEqual([]);
  });

  it("un cobro real con tarjeta guardada trae el recibo de Stripe", async () => {
    // `stripe-payment-methods` crea el Customer de Stripe la primera vez.
    await supabase.functions.invoke("stripe-payment-methods", { body: { action: "list" } });
    const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).single();
    const paymentMethodId = await attachTestCard(profile!.stripe_customer_id as string);
    const charge = await chargeSavedPaymentMethod(supabase, {
      loungeId: "the-ainsworth",
      dateIso: "2025-09-01",
      band: "afternoon",
      slotTime: "1:00 PM",
      specialRequests: "",
      paymentMethodId,
      idempotencyKey: crypto.randomUUID(),
    });
    // Sin `stripe listen` el webhook no llega en local: se liquida igual que lo haría él.
    await settleTestPayment(charge.paymentId);

    const { receipts } = await fetchReceipts(supabase);
    const receipt = receipts.find((row) => row.id === charge.paymentId)!;

    expect(receipt.title).toMatch(/^Day pass/);
    expect(receipt.amount).toBe(81.66);
    expect(receipt.status).toBe("paid");
    expect(receipt.receiptUrl).toMatch(/^https:\/\/pay\.stripe\.com\/receipts\//);
  });

  it("una membresía pagada sale como tal; un pago pendiente no sale", async () => {
    const membershipPaymentId = await insertSucceededTestPayment(userId, 240000);
    await admin.from("payments").update({ membership_plan: "annual" }).eq("id", membershipPaymentId);
    const { data: pending } = await admin
      .from("payments")
      .insert({ member_id: userId, amount_cents: 8166, status: "pending" })
      .select("id")
      .single();

    const { receipts, yearTotal } = await fetchReceipts(supabase);

    expect(receipts.find((row) => row.id === membershipPaymentId)?.title).toBe("Annual membership");
    expect(receipts.some((row) => row.id === pending!.id)).toBe(false);
    expect(yearTotal).toBeGreaterThanOrEqual(2400);
  });
});

describe("openBillingPortal", () => {
  it("abre una sesión del Customer Portal de Stripe para el miembro", async () => {
    const supabase = createClient();
    await signUpConfirmedMemberAndSignIn(supabase, `billing-portal-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");

    const url = await openBillingPortal(supabase, "http://localhost:3000/profile/membership");

    expect(url).toMatch(/^https:\/\/billing\.stripe\.com\//);
  });
});
