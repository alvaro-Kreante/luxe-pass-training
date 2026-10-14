// Story 6.1 — "Modification options: Cancel" + "24-hour advance notice
// requirement for cancellation". E2E-07 / SPEC-04 (docs/audit): cancelar con
// más de 24h de antelación es gratis, así que el day pass pagado se
// reembolsa de verdad en Stripe (decisión de producto, 13 oct 2026).
//
// `cancel_booking` (bookings.sql) sigue decidiendo, con la sesión del
// miembro, si la reserva es suya, si se puede cancelar y si lleva fee; esta
// function solo añade el reembolso. Volver a llamarla sobre una reserva ya
// cancelada sin fee reintenta un reembolso que falló (misma clave de
// idempotencia en Stripe, nunca dos reembolsos).
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerClient, getServiceClient, getStripeClient, requireCaller } from "../_shared/stripe-context.ts";

interface RequestBody {
  bookingId: string;
  today: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireCaller(req);
    const body = (await req.json()) as RequestBody;
    if (!body.bookingId || !body.today) return json({ error: "Missing bookingId or today" }, 400);

    const service = getServiceClient();
    const { data: booking } = await service
      .from("bookings")
      .select("id, member_id, status, cancellation_fee_cents")
      .eq("id", body.bookingId)
      .maybeSingle();
    if (!booking || booking.member_id !== caller.id) return json({ error: "Booking not found" }, 404);

    const { data: payment } = await service
      .from("payments")
      .select("id, status, amount_cents, refunded_amount_cents, stripe_payment_intent_id")
      .eq("booking_id", booking.id)
      .maybeSingle();

    // Con tarjeta nueva el webhook puede no haber confirmado aún el cobro:
    // cancelar ahora dejaría un pago que se cobra sin nada que reembolsar.
    if (payment?.status === "pending") {
      return json({ error: "Your payment is still processing. Try again in a minute." }, 409);
    }

    let cancellationFeeCents: number | null = booking.cancellation_fee_cents;
    if (booking.status !== "cancelled") {
      const { data: cancelled, error } = await getCallerClient(req)
        .rpc("cancel_booking", { p_booking_id: booking.id, p_today: body.today })
        .single();
      if (error) return json({ error: error.message }, 409);
      cancellationFeeCents = (cancelled as { cancellation_fee_cents: number | null }).cancellation_fee_cents;
    }

    const refundable =
      cancellationFeeCents === null &&
      payment?.status === "succeeded" &&
      payment.stripe_payment_intent_id &&
      (payment.refunded_amount_cents ?? 0) < payment.amount_cents;

    if (!refundable) {
      return json({ id: booking.id, cancellationFeeCents, refundedCents: payment?.refunded_amount_cents ?? null });
    }

    const amountCents = payment.amount_cents - (payment.refunded_amount_cents ?? 0);
    const refund = await getStripeClient().refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: { booking_id: booking.id, cause: "free_cancellation" },
      },
      { idempotencyKey: `booking-cancel-refund-${booking.id}` },
    );

    if (refund.status === "succeeded" || refund.status === "pending") {
      const { error: updateError } = await service
        .from("payments")
        .update({
          status: "refunded",
          refunded_amount_cents: payment.amount_cents,
          refunded_at: new Date().toISOString(),
          refund_reason: "Free cancellation (24h+ notice)",
          stripe_refund_id: refund.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      if (updateError) throw updateError;
    }

    return json({ id: booking.id, cancellationFeeCents, refundedCents: payment.amount_cents });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
