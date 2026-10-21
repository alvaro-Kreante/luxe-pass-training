import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { confirmBooking } from "./booking";
import { LOUNGES } from "./lounges";
import { createCheckoutSession } from "./stripe-payments";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { findPredictedSlot } from "./testing/lounge-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 4.2 — tarjeta nueva (Checkout Session). `stripe-webhook` traduce los
 * eventos de la sesión a `settle_checkout_session` y esta función decide el
 * estado del pago — se prueba directamente para no depender de firmar
 * eventos de Stripe en CI.
 *
 * - PAY-01: el `payment_intent` de la sesión se guarda al completarse, para
 *   que el reembolso y los eventos `payment_intent.*` encuentren la fila.
 * - SEC-02: `confirm_booking` acepta un pago aún `pending` (el webhook puede
 *   llegar después), así que un pago que acaba `failed` (sesión caducada sin
 *   pagar, rechazo) cancela la reserva que se confirmó con él.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const member = isolatedClient();

beforeAll(async () => {
  await signUpConfirmedMemberAndSignIn(member, `checkout-settle-${Date.now()}@ensoleil-test.example`, "EnSoleil!2026");
});

async function bookWithUnpaidSession(occurrence: number) {
  const slot = findPredictedSlot(ainsworth, "available", occurrence);
  const session = await createCheckoutSession(member, {
    loungeId: ainsworth.id,
    dateIso: slot.dateIso,
    band: slot.band,
    slotTime: slot.time,
    specialRequests: "",
    saveCard: false,
  });
  const booking = await confirmBooking(
    member,
    { loungeId: ainsworth.id, dateIso: slot.dateIso, band: slot.band, time: slot.time, specialRequests: "" },
    session.paymentId,
  );
  const { data: payment } = await admin
    .from("payments")
    .select("stripe_checkout_session_id")
    .eq("id", session.paymentId)
    .single();

  return { paymentId: session.paymentId, bookingId: booking!.id, sessionId: payment!.stripe_checkout_session_id as string };
}

describe("settle_checkout_session", () => {
  it("SEC-02 — una sesión que acaba sin pagar cancela la reserva confirmada con ella", async () => {
    const { paymentId, bookingId, sessionId } = await bookWithUnpaidSession(6);

    const { error } = await admin.rpc("settle_checkout_session", {
      p_session_id: sessionId,
      p_outcome: "failed",
      p_payment_intent_id: null,
    });

    expect(error).toBeNull();
    const { data: payment } = await admin.from("payments").select("status").eq("id", paymentId).single();
    const { data: booking } = await admin
      .from("bookings")
      .select("status, cancellation_fee_cents")
      .eq("id", bookingId)
      .single();
    expect(payment?.status).toBe("failed");
    expect(booking?.status).toBe("cancelled");
    expect(booking?.cancellation_fee_cents ?? 0).toBe(0);
  });

  it("PAY-01 — una sesión pagada guarda su payment_intent y deja la reserva confirmada", async () => {
    const { paymentId, bookingId, sessionId } = await bookWithUnpaidSession(7);
    const paymentIntentId = `pi_test_${Date.now()}`;

    await admin.rpc("settle_checkout_session", {
      p_session_id: sessionId,
      p_outcome: "succeeded",
      p_payment_intent_id: paymentIntentId,
    });

    const { data: payment } = await admin
      .from("payments")
      .select("status, stripe_payment_intent_id")
      .eq("id", paymentId)
      .single();
    const { data: booking } = await admin.from("bookings").select("status").eq("id", bookingId).single();
    expect(payment).toEqual({ status: "succeeded", stripe_payment_intent_id: paymentIntentId });
    expect(booking?.status).toBe("confirmed");
  });

  it("un pago ya cobrado no vuelve atrás por un evento tardío de fallo", async () => {
    const { paymentId, sessionId } = await bookWithUnpaidSession(8);
    await admin.rpc("settle_checkout_session", {
      p_session_id: sessionId,
      p_outcome: "succeeded",
      p_payment_intent_id: `pi_test_late_${Date.now()}`,
    });

    await admin.rpc("settle_checkout_session", { p_session_id: sessionId, p_outcome: "failed", p_payment_intent_id: null });

    const { data: payment } = await admin.from("payments").select("status").eq("id", paymentId).single();
    expect(payment?.status).toBe("succeeded");
  });

  it("un miembro no puede marcar su propio pago como cobrado", async () => {
    const { sessionId } = await bookWithUnpaidSession(9);

    const { error } = await member.rpc("settle_checkout_session", {
      p_session_id: sessionId,
      p_outcome: "succeeded",
      p_payment_intent_id: "pi_fake",
    });

    expect(error).not.toBeNull();
  });
});
