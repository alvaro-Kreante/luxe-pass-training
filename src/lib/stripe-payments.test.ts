import { beforeAll, describe, expect, it } from "vitest";

import {
  chargeSavedPaymentMethod,
  createCheckoutSession,
  listSavedPaymentMethods,
  removeSavedPaymentMethod,
  type CardChargeRequest,
} from "./stripe-payments";
import { confirmBooking, type BookingRequest } from "./booking";
import { LOUNGES } from "./lounges";
import { createClient } from "./supabase/client";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { findPredictedSlot } from "./testing/lounge-fixture";
import { attachTestCard } from "./testing/stripe-fixture";

/**
 * Story 4.2 — Payment Processing, conectada a Stripe real (modo test).
 * Corre contra las Edge Functions servidas localmente y la sandbox de
 * Stripe real — dos precondiciones además de `supabase start`:
 *
 *   supabase functions serve --env-file supabase/functions/.env
 *
 * Sin eso, `supabase.functions.invoke` falla con "Failed to fetch" (nada
 * escuchando en /functions/v1/*), no con un error de Stripe.
 *
 * `attachTestCard` adjunta una tarjeta de prueba de Stripe (`pm_card_visa`)
 * directo contra la API de Stripe — no hay forma de montar el
 * `<PaymentElement>` real en jsdom, así que el camino de "tarjeta guardada"
 * se prueba sembrando la tarjeta por API, igual que Stripe documenta para
 * tests automatizados (no es un mock: es una tarjeta de prueba real).
 */

const request: CardChargeRequest = {
  loungeId: "the-ainsworth",
  dateIso: "2025-09-01",
  band: "afternoon",
  slotTime: "1:00 PM",
  specialRequests: "",
};

async function stripeCustomerIdFor(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data.stripe_customer_id as string;
}

describe("createCheckoutSession — tarjeta nueva", () => {
  const supabase = createClient();

  beforeAll(async () => {
    await signUpConfirmedMemberAndSignIn(
      supabase,
      `stripe-checkout-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );
  });

  it("crea una Checkout Session real y su fila de payments (pending)", async () => {
    const result = await createCheckoutSession(supabase, { ...request, saveCard: false });

    expect(result.clientSecret).toMatch(/^cs_test_/);
    expect(result.paymentId).toMatch(/^[0-9a-f-]{36}$/);

    const { data: payment, error } = await supabase
      .from("payments")
      .select("status, amount_cents, currency")
      .eq("id", result.paymentId)
      .single();

    expect(error).toBeNull();
    expect(payment?.status).toBe("pending");
    expect(payment?.amount_cents).toBe(8166); // $75 day pass + 8.875% NY tax
    expect(payment?.currency).toBe("usd");
  });
});

describe("tarjetas guardadas — Customer de Stripe real", () => {
  const supabase = createClient();
  let userId: string;

  beforeAll(async () => {
    const user = await signUpConfirmedMemberAndSignIn(
      supabase,
      `stripe-saved-cards-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );
    userId = user.id;
  });

  it("no hay tarjetas guardadas para un miembro nuevo", async () => {
    const methods = await listSavedPaymentMethods(supabase);

    expect(methods).toEqual([]);
  });

  it("crea un Customer de Stripe la primera vez que hace falta", async () => {
    const customerId = await stripeCustomerIdFor(supabase, userId);

    expect(customerId).toMatch(/^cus_/);
  });

  it("cobra con una tarjeta guardada y el webhook confirma el pago", async () => {
    const customerId = await stripeCustomerIdFor(supabase, userId);
    const paymentMethodId = await attachTestCard(customerId);

    const charge = await chargeSavedPaymentMethod(supabase, { ...request, paymentMethodId, idempotencyKey: crypto.randomUUID() });

    expect(charge.status).toBe("succeeded");
    expect(charge.error).toBeNull();

    const methods = await listSavedPaymentMethods(supabase);
    expect(methods.some((method) => method.id === paymentMethodId)).toBe(true);
  });

  it("E2E-01 — el mismo intento repetido (misma idempotencyKey) cobra una sola vez", async () => {
    const customerId = await stripeCustomerIdFor(supabase, userId);
    const paymentMethodId = await attachTestCard(customerId);
    const idempotencyKey = crypto.randomUUID();

    const [first, second] = await Promise.all([
      chargeSavedPaymentMethod(supabase, { ...request, paymentMethodId, idempotencyKey }),
      chargeSavedPaymentMethod(supabase, { ...request, paymentMethodId, idempotencyKey }),
    ]);

    expect(second.paymentId).toBe(first.paymentId);
    const { data: payment } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("id", first.paymentId)
      .single();
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("stripe_payment_intent_id", payment!.stripe_payment_intent_id);
    expect(count).toBe(1);
  });

  it("E2E-01 — un mismo pago no confirma dos reservas aunque lleguen a la vez", async () => {
    const customerId = await stripeCustomerIdFor(supabase, userId);
    const paymentMethodId = await attachTestCard(customerId);
    const slot = findPredictedSlot(LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!, "available", 5);
    const charge = await chargeSavedPaymentMethod(supabase, {
      ...request,
      dateIso: slot.dateIso,
      band: slot.band,
      slotTime: slot.time,
      paymentMethodId,
      idempotencyKey: crypto.randomUUID(),
    });
    const booking: BookingRequest = {
      loungeId: "the-ainsworth",
      dateIso: slot.dateIso,
      band: slot.band,
      time: slot.time,
      specialRequests: "",
    };

    const results = await Promise.allSettled([
      confirmBooking(supabase, booking, charge.paymentId),
      confirmBooking(supabase, booking, charge.paymentId),
    ]);

    expect(results.filter((result) => result.status === "fulfilled" && result.value)).toHaveLength(1);
  });

  it("quitar una tarjeta guardada la retira del listado", async () => {
    const customerId = await stripeCustomerIdFor(supabase, userId);
    const paymentMethodId = await attachTestCard(customerId);

    await removeSavedPaymentMethod(supabase, paymentMethodId);

    const methods = await listSavedPaymentMethods(supabase);
    expect(methods.some((method) => method.id === paymentMethodId)).toBe(false);
  });
});
