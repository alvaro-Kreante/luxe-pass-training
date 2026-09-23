// Story 8.1 — "Refund processing interface", reembolso real vía Stripe
// (decisión tomada con el usuario el 22 sept 2026 — revierte la nota de
// docs/DATA-MODEL-MAP.md que daba esto por fuera de alcance). Solo cubre un
// cargo real de Stripe (`payments.status = 'succeeded'`); la tarifa de
// no-show/cancelación tardía nunca se cobró de verdad (ver
// `admin_waive_booking_fee`, `supabase/schemas/support_tickets.sql`) — no hay
// nada que reversar en Stripe para esa, así que no pasa por aquí.
//
// El estado de `payments` lo sigue escribiendo esta function de forma
// optimista (Stripe confirma un reembolso en modo test al instante) más el
// webhook (`charge.refunded`) como defensa en profundidad — mismo principio
// que el resto de Story 4.2.
import { corsHeaders } from "../_shared/cors.ts";
import { getCallerClient, getServiceClient, getStripeClient, requireCaller } from "../_shared/stripe-context.ts";

interface RequestBody {
  paymentId: string;
  amountCents?: number;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireCaller(req);

    const { data: isAdmin } = await getCallerClient(req).rpc("has_role", { p_role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.paymentId) {
      return new Response(JSON.stringify({ error: "Missing paymentId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = getServiceClient();
    const { data: payment, error: paymentError } = await service
      .from("payments")
      .select("id, amount_cents, refunded_amount_cents, status, stripe_payment_intent_id")
      .eq("id", body.paymentId)
      .single();
    if (paymentError) throw paymentError;

    if (payment.status !== "succeeded" || !payment.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "Only a succeeded Stripe payment can be refunded" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const alreadyRefunded = payment.refunded_amount_cents ?? 0;
    const amountCents = body.amountCents ?? payment.amount_cents - alreadyRefunded;

    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: amountCents,
      reason: "requested_by_customer",
      metadata: body.reason ? { admin_reason: body.reason } : undefined,
    });

    const totalRefunded = alreadyRefunded + amountCents;
    const fullyRefunded = totalRefunded >= payment.amount_cents;

    if (refund.status === "succeeded") {
      const { error: updateError } = await service
        .from("payments")
        .update({
          status: fullyRefunded ? "refunded" : "succeeded",
          refunded_amount_cents: totalRefunded,
          refunded_at: new Date().toISOString(),
          refund_reason: body.reason ?? null,
          stripe_refund_id: refund.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.paymentId);
      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ refundId: refund.id, status: refund.status, amountCents: totalRefunded }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
