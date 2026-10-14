import { createClient as createAdminClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { today } from "./availability";
import { confirmBooking, type BookingRequest } from "./booking";
import { LOUNGES } from "./lounges";
import { cancelBooking, LATE_CANCELLATION_FEE_CENTS } from "./passes";
import { chargeSavedPaymentMethod, listSavedPaymentMethods } from "./stripe-payments";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { findPredictedSlot } from "./testing/lounge-fixture";
import { isolatedClient } from "./testing/partner-invite-fixture";
import { attachTestCard } from "./testing/stripe-fixture";

/**
 * Story 6.1 — "24-hour advance notice requirement for cancellation".
 * E2E-07 / SPEC-04 (docs/audit): cancelar con más de 24h de antelación es
 * gratis, así que un day pass pagado se reembolsa de verdad en Stripe
 * (decisión de producto, 13 oct 2026). Con menos de 24h se registra el fee
 * y no hay reembolso. Corre contra Stripe real (modo test), como
 * `stripe-payments.test.ts`.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

/** Una franja abierta de verdad: a partir de mañana (24h+, cancelación gratis). */
function freeCancellationSlot(occurrence: number): Slot {
  const { dateIso, band, time } = findPredictedSlot(ainsworth, "available", occurrence);
  return { dateIso, band, time };
}

/** Una franja de hoy con plazas (menos de 24h: cancelación con fee). */
async function slotToday(): Promise<Slot> {
  const { data } = await admin.rpc("lounge_availability_range", { p_lounge_id: ainsworth.id, p_from: today(), p_to: today() });
  const open = (data as { band: BookingRequest["band"]; seats_left: number }[]).find((cell) => cell.seats_left > 0);
  if (!open) throw new Error("The Ainsworth no tiene plazas hoy");
  const times: Record<string, string> = { morning: "8:00 AM", afternoon: "3:30 PM", evening: "6:00 PM", late: "6:00 PM" };
  return { dateIso: today(), band: open.band, time: times[open.band]! };
}

type Slot = Pick<BookingRequest, "dateIso" | "band" | "time">;

async function paidBooking(label: string, slot: Slot) {
  const supabase = isolatedClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `cancel-refund-${label}-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  await listSavedPaymentMethods(supabase);
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  const paymentMethodId = await attachTestCard(profile!.stripe_customer_id as string);

  const charge = { loungeId: ainsworth.id, dateIso: slot.dateIso, band: slot.band, slotTime: slot.time, specialRequests: "", paymentMethodId, idempotencyKey: crypto.randomUUID() };
  const { paymentId } = await chargeSavedPaymentMethod(supabase, charge);
  const booking = await confirmBooking(supabase, { loungeId: ainsworth.id, ...slot, specialRequests: "" }, paymentId);

  return { supabase, bookingId: booking!.id, paymentId };
}

async function paymentOf(paymentId: string) {
  const { data } = await admin
    .from("payments")
    .select("status, amount_cents, refunded_amount_cents")
    .eq("id", paymentId)
    .single();
  return data!;
}

describe("cancelar una reserva pagada", () => {
  it("con más de 24h de antelación reembolsa el day pass completo en Stripe", async () => {
    const { supabase, bookingId, paymentId } = await paidBooking("free", freeCancellationSlot(10));

    const cancelled = await cancelBooking(supabase, bookingId, today());

    const payment = await paymentOf(paymentId);
    expect(cancelled.cancellationFeeCents).toBeNull();
    expect(cancelled.refundedCents).toBe(payment.amount_cents);
    expect(payment.status).toBe("refunded");
    expect(payment.refunded_amount_cents).toBe(payment.amount_cents);
  });

  it("con menos de 24h registra el fee y no reembolsa", async () => {
    const { supabase, bookingId, paymentId } = await paidBooking("late", await slotToday());

    const cancelled = await cancelBooking(supabase, bookingId, today());

    expect(cancelled.cancellationFeeCents).toBe(LATE_CANCELLATION_FEE_CENTS);
    expect(cancelled.refundedCents).toBeNull();
    expect((await paymentOf(paymentId)).status).toBe("succeeded");
  });

  it("otro miembro no puede cancelar (ni reembolsar) la reserva", async () => {
    const { bookingId, paymentId } = await paidBooking("owner", freeCancellationSlot(11));
    const other = isolatedClient();
    await signUpConfirmedMemberAndSignIn(other, `cancel-refund-other-${Date.now()}@ensoleil-test.com`, "EnSoleil!2026");

    await expect(cancelBooking(other, bookingId, today())).rejects.toThrow();
    expect((await paymentOf(paymentId)).status).toBe("succeeded");
  });
});
