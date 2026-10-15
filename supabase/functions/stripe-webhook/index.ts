// Story 4.2 — única fuente de verdad de `payments.status` (nunca el
// cliente tras el submit, ver CLAUDE.md §Procesamiento de pagos). Cubre las
// dos rutas de cobro: Checkout Session (tarjeta nueva, `ui_mode: "elements"`)
// y PaymentIntent directo (tarjeta guardada, `stripe-charge-saved-method`).
//
// `constructEventAsync` + `Stripe.createSubtleCryptoProvider()` en vez del
// `constructEvent` síncrono habitual: la verificación de firma de Stripe usa
// el módulo `crypto` de Node, que no existe en el runtime de Deno de las
// Edge Functions — la variante async usa Web Crypto (`SubtleCrypto`), que sí.
import Stripe from "npm:stripe@22.6.0";

import { getServiceClient, getStripeClient } from "../_shared/stripe-context.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") as string;

/** 500 para que Stripe reintente el evento en vez de darlo por procesado. */
function failed(message: string): Response {
  return new Response(JSON.stringify({ error: message }), { status: 500 });
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Invalid signature" }),
      { status: 401 },
    );
  }

  const service = getServiceClient();

  switch (event.type) {
    // Tarjeta nueva — `settle_checkout_session` (payments.sql) guarda el
    // payment_intent al cobrarse (PAY-01) y, si la sesión caduca o falla,
    // marca el pago 'failed' y un trigger cancela la reserva hecha con él
    // (SEC-02).
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "unpaid") {
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
        const { error } = await service.rpc("settle_checkout_session", {
          p_session_id: session.id,
          p_outcome: "succeeded",
          p_payment_intent_id: paymentIntentId,
        });
        if (error) return failed(error.message);
      }
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { error } = await service.rpc("settle_checkout_session", {
        p_session_id: session.id,
        p_outcome: "failed",
        p_payment_intent_id: null,
      });
      if (error) return failed(error.message);
      break;
    }
    // SEC-04 — `settle_payment_intent` solo saca un pago de 'pending': un
    // evento tardío o repetido no deshace un pago cobrado ni reembolsado.
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const { error } = await service.rpc("settle_payment_intent", {
        p_payment_intent_id: intent.id,
        p_outcome: event.type === "payment_intent.succeeded" ? "succeeded" : "failed",
      });
      if (error) return failed(error.message);
      break;
    }
    // Story 8.1 — defensa en profundidad del reembolso que ya escribe
    // `stripe-refund-payment` de forma optimista: cubre un reembolso que
    // Stripe termine de confirmar de forma asíncrona (modo live) o uno
    // iniciado desde el propio Dashboard de Stripe, no desde esta consola.
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const intentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!intentId) break;

      // PAY-04 — total de Stripe, que `record_payment_refund` nunca deja
      // retroceder; el paso a 'refunded' deshace la compra (PAY-03).
      const { error } = await service.rpc("record_payment_refund", {
        p_payment_intent_id: intentId,
        p_refunded_total_cents: charge.amount_refunded,
      });
      if (error) return failed(error.message);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
