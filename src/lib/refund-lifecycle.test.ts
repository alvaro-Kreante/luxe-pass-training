import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { refundPayment } from "./admin";
import { confirmBooking } from "./booking";
import { LOUNGES } from "./lounges";
import { chargeSavedPaymentMethod, listSavedPaymentMethods } from "./stripe-payments";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { findPredictedSlot } from "./testing/lounge-fixture";
import { grantTestMembership } from "./testing/membership-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";
import { attachTestCard } from "./testing/stripe-fixture";

/**
 * Story 8.1 — "Refund processing interface" y Story 4.2 (webhook de Stripe).
 * docs/audit: SEC-04 (un evento tardío o repetido no deshace un pago
 * reembolsado), PAY-03 (un reembolso completo deshace lo que el pago
 * compró) y PAY-04 (importe validado, sin doble reembolso, total que nunca
 * retrocede). `settle_payment_intent` y `record_payment_refund` son las RPC
 * que usa `stripe-webhook`; se prueban directamente para no firmar eventos
 * de Stripe en CI.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const adminUser = isolatedClient();

beforeAll(async () => {
  await signUpConfirmedAdminAndSignIn(adminUser, `refund-admin-${Date.now()}@ensoleil-test.com`, "EnSoleil!2026");
});

async function newMember(label: string, membership?: "annual") {
  const supabase = isolatedClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `refund-${label}-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
    membership ? { membership } : undefined,
  );
  return { supabase, memberId: user.id };
}

async function insertPayment(fields: Record<string, unknown>) {
  const { data, error } = await admin
    .from("payments")
    .insert({ amount_cents: 7500, status: "succeeded", stripe_payment_intent_id: `pi_test_${crypto.randomUUID()}`, ...fields })
    .select("id, stripe_payment_intent_id")
    .single();
  if (error) throw error;
  return data as { id: string; stripe_payment_intent_id: string };
}

async function paymentRow(id: string) {
  const { data } = await admin.from("payments").select("status, refunded_amount_cents").eq("id", id).single();
  return data!;
}

describe("SEC-04 — transiciones del webhook", () => {
  it("un payment_intent.succeeded tardío no devuelve a cobrado un pago reembolsado", async () => {
    const { memberId } = await newMember("late-succeeded");
    const payment = await insertPayment({ member_id: memberId, status: "refunded", refunded_amount_cents: 7500 });

    const { error } = await admin.rpc("settle_payment_intent", {
      p_payment_intent_id: payment.stripe_payment_intent_id,
      p_outcome: "succeeded",
    });

    expect(error).toBeNull();
    expect((await paymentRow(payment.id)).status).toBe("refunded");
  });

  it("un payment_intent.payment_failed tardío no marca como fallido un pago cobrado", async () => {
    const { memberId } = await newMember("late-failed");
    const payment = await insertPayment({ member_id: memberId });

    await admin.rpc("settle_payment_intent", { p_payment_intent_id: payment.stripe_payment_intent_id, p_outcome: "failed" });

    expect((await paymentRow(payment.id)).status).toBe("succeeded");
  });

  it("un pago pendiente sí pasa a cobrado", async () => {
    const { memberId } = await newMember("pending");
    const payment = await insertPayment({ member_id: memberId, status: "pending" });

    await admin.rpc("settle_payment_intent", { p_payment_intent_id: payment.stripe_payment_intent_id, p_outcome: "succeeded" });

    expect((await paymentRow(payment.id)).status).toBe("succeeded");
  });

  it("el total reembolsado nunca retrocede aunque llegue un evento viejo", async () => {
    const { memberId } = await newMember("monotonic");
    const payment = await insertPayment({ member_id: memberId });

    await admin.rpc("record_payment_refund", { p_payment_intent_id: payment.stripe_payment_intent_id, p_refunded_total_cents: 5000 });
    await admin.rpc("record_payment_refund", { p_payment_intent_id: payment.stripe_payment_intent_id, p_refunded_total_cents: 2000 });

    expect(await paymentRow(payment.id)).toEqual({ status: "succeeded", refunded_amount_cents: 5000 });
  });

  it("un miembro no puede llamar a las RPC del webhook", async () => {
    const { supabase, memberId } = await newMember("rpc-member");
    const payment = await insertPayment({ member_id: memberId, status: "pending" });

    const { error } = await supabase.rpc("settle_payment_intent", {
      p_payment_intent_id: payment.stripe_payment_intent_id,
      p_outcome: "succeeded",
    });

    expect(error).not.toBeNull();
    expect((await paymentRow(payment.id)).status).toBe("pending");
  });
});

describe("PAY-03 — un reembolso completo deshace lo que el pago compró", () => {
  it("cancela, sin fee, la reserva pagada con él", async () => {
    const { supabase, memberId } = await newMember("refund-booking", "annual");
    const slot = findPredictedSlot(ainsworth, "available", 7);
    const booking = await confirmBooking(supabase, { loungeId: ainsworth.id, ...slot, specialRequests: "" });
    const payment = await insertPayment({ member_id: memberId, booking_id: booking!.id });

    await admin.rpc("record_payment_refund", { p_payment_intent_id: payment.stripe_payment_intent_id, p_refunded_total_cents: 7500 });

    const { data } = await admin.from("bookings").select("status, cancellation_fee_cents").eq("id", booking!.id).single();
    expect(data).toEqual({ status: "cancelled", cancellation_fee_cents: null });
  });

  it("vence la membresía comprada con él", async () => {
    const { memberId } = await newMember("refund-membership");
    await grantTestMembership(memberId, "annual");
    const payment = await insertPayment({ member_id: memberId, membership_plan: "annual", amount_cents: 240000 });

    await admin.rpc("record_payment_refund", { p_payment_intent_id: payment.stripe_payment_intent_id, p_refunded_total_cents: 240000 });

    const { data } = await admin.from("memberships").select("status").eq("member_id", memberId).single();
    expect(data!.status).toBe("expired");
  });

  it("un reembolso parcial no toca la reserva", async () => {
    const { supabase, memberId } = await newMember("partial", "annual");
    const slot = findPredictedSlot(ainsworth, "available", 8);
    const booking = await confirmBooking(supabase, { loungeId: ainsworth.id, ...slot, specialRequests: "" });
    const payment = await insertPayment({ member_id: memberId, booking_id: booking!.id });

    await admin.rpc("record_payment_refund", { p_payment_intent_id: payment.stripe_payment_intent_id, p_refunded_total_cents: 2500 });

    const { data } = await admin.from("bookings").select("status").eq("id", booking!.id).single();
    expect(data!.status).toBe("confirmed");
  });
});

describe("PAY-04 — stripe-refund-payment", () => {
  it("rechaza un importe negativo o mayor que lo que queda por reembolsar", async () => {
    const { memberId } = await newMember("invalid-amount");
    const payment = await insertPayment({ member_id: memberId, refunded_amount_cents: 5000 });

    // 400 de validación, antes de llegar a Stripe (el payment intent de
    // esta fila es inventado: Stripe respondería con otro error).
    const statusFor = (amountCents: number) =>
      refundPayment(adminUser, payment.id, amountCents).then(
        () => 200,
        (error: { context?: Response }) => error.context?.status,
      );

    expect(await statusFor(-100)).toBe(400);
    expect(await statusFor(2501)).toBe(400);
    expect((await paymentRow(payment.id)).refunded_amount_cents).toBe(5000);
  });

  it("dos clics a la vez en el mismo reembolso reembolsan una sola vez", async () => {
    const { supabase, memberId } = await newMember("double-refund");
    await listSavedPaymentMethods(supabase);
    const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", memberId).single();
    const paymentMethodId = await attachTestCard(profile!.stripe_customer_id as string);
    const slot = findPredictedSlot(ainsworth, "available", 9);
    const { paymentId } = await chargeSavedPaymentMethod(supabase, {
      loungeId: ainsworth.id,
      dateIso: slot.dateIso,
      band: slot.band,
      slotTime: slot.time,
      specialRequests: "",
      paymentMethodId,
      idempotencyKey: crypto.randomUUID(),
    });

    const results = await Promise.allSettled([
      refundPayment(adminUser, paymentId, 1000),
      refundPayment(adminUser, paymentId, 1000),
    ]);

    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    expect((await paymentRow(paymentId)).refunded_amount_cents).toBe(1000);
  });
});
