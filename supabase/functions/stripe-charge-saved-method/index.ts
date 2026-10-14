// Story 4.2 — cobra un day pass con una tarjeta ya guardada, elegida en
// `Payment.dc.html` (radio distinto de "Use a new card"). A diferencia de la
// tarjeta nueva, no hace falta montar `<PaymentElement>`: el PaymentIntent
// se crea y confirma en el mismo paso servidor-a-servidor, sin que el
// navegador vea nunca datos de la tarjeta (ya vivían en Stripe).
import Stripe from "npm:stripe@22.6.0";

import { corsHeaders } from "../_shared/cors.ts";
import {
  dayPassAmountCents,
  ensureStripeCustomer,
  getServiceClient,
  getStripeClient,
  requireCaller,
} from "../_shared/stripe-context.ts";

interface RequestBody {
  paymentMethodId: string;
  loungeId: string;
  dateIso: string;
  band: string;
  slotTime: string;
  specialRequests: string;
  /** Uno por intento de pago: repetirlo devuelve el mismo cobro (E2E-01). */
  idempotencyKey: string;
}

/** Stripe responde 409 mientras otra petición con la misma clave sigue en curso. */
async function withIdempotencyRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const inUse = error instanceof Stripe.errors.StripeError && error.code === "idempotency_key_in_use";
      if (!inUse || attempt >= 10) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireCaller(req);
    const body = (await req.json()) as RequestBody;

    if (!body.paymentMethodId || !body.idempotencyKey || !body.loungeId || !body.dateIso || !body.band || !body.slotTime) {
      return new Response(JSON.stringify({ error: "Missing booking details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = getStripeClient();
    const service = getServiceClient();
    const customerId = await ensureStripeCustomer(service, stripe, caller.id, caller.email);
    const amountCents = dayPassAmountCents();

    let paymentIntent: Stripe.PaymentIntent;
    let declineMessage: string | null = null;
    try {
      paymentIntent = await withIdempotencyRetry(() => stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        customer: customerId,
        payment_method: body.paymentMethodId,
        confirm: true,
        off_session: false,
        // Tarjeta guardada elegida en nuestro propio radio (no en el
        // Payment Element de Stripe): sin `payment_method_types` (dynamic
        // payment methods, ver stripe-best-practices), Stripe exige o un
        // `return_url` o desactivar explícitamente los métodos con
        // redirect — no aplica aquí, ya sabemos que es una tarjeta.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        metadata: {
          member_id: caller.id,
          lounge_id: body.loungeId,
          date: body.dateIso,
          band: body.band,
          slot_time: body.slotTime,
          special_requests: body.specialRequests ?? "",
        },
      }, { idempotencyKey: `saved-charge-${caller.id}-${body.idempotencyKey}` }));
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        paymentIntent = error.payment_intent as Stripe.PaymentIntent;
        declineMessage = error.message;
      } else {
        throw error;
      }
    }

    const status = paymentIntent.status === "succeeded" ? "succeeded" : "failed";

    // Un reintento con la misma clave trae el mismo PaymentIntent: una sola fila.
    const { error: insertError } = await service
      .from("payments")
      .upsert(
        {
          member_id: caller.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: amountCents,
          currency: "usd",
          status,
        },
        { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true },
      );
    if (insertError) throw insertError;

    const { data: payment, error: selectError } = await service
      .from("payments")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();
    if (selectError) throw selectError;

    return new Response(
      JSON.stringify({ paymentId: payment.id, status, error: declineMessage }),
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
