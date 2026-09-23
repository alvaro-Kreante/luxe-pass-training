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
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "unpaid") {
        await service
          .from("payments")
          .update({ status: "succeeded", updated_at: new Date().toISOString() })
          .eq("stripe_checkout_session_id", session.id);
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await service
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("stripe_checkout_session_id", session.id);
      break;
    }
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await service
        .from("payments")
        .update({ status: "succeeded", updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await service
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", intent.id);
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

      const { data: payment } = await service
        .from("payments")
        .select("amount_cents")
        .eq("stripe_payment_intent_id", intentId)
        .single();
      if (!payment) break;

      const fullyRefunded = charge.amount_refunded >= payment.amount_cents;
      await service
        .from("payments")
        .update({
          status: fullyRefunded ? "refunded" : "succeeded",
          refunded_amount_cents: charge.amount_refunded,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", intentId);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
