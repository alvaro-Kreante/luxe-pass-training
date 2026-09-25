// Story 9.1 — "Upgrade options to monthly subscribers and pricing" + elegir
// plan desde una membresía inactiva (decisión de producto, 23 sept 2026:
// cobro PUNTUAL real de Stripe, no Stripe Billing). Dos rutas, gemelas de
// las del day pass de la Story 4.2:
//
//   - `charge_saved`: PaymentIntent confirmado servidor a servidor con una
//     tarjeta ya guardada ("The card already on your membership",
//     `Upgrade.dc.html`) — igual que `stripe-charge-saved-method`.
//   - `create_session`: Checkout Session `ui_mode: "elements"` para montar
//     `<PaymentElement>` en el modal cuando no hay tarjeta guardada — igual
//     que `stripe-create-checkout-session`. El webhook existente
//     (`stripe-webhook`) liquida el pago; no hace falta tocarlo.
//
// El importe NUNCA lo manda el navegador: sale de `membership_change_quote`,
// llamada con el JWT del propio miembro (así también hereda sus reglas: no
// repetir plan, no bajar de anual a mensual). La membresía no se escribe
// aquí: el trigger `apply_membership_payment` (memberships.sql) la activa
// cuando `payments.status` pasa a 'succeeded', venga de donde venga.
import Stripe from "npm:stripe@22.6.0";

import { corsHeaders } from "../_shared/cors.ts";
import {
  ensureStripeCustomer,
  getCallerClient,
  getServiceClient,
  getStripeClient,
  requireCaller,
} from "../_shared/stripe-context.ts";

type PlanId = "monthly" | "annual";

type RequestBody =
  | { action: "charge_saved"; plan: PlanId; paymentMethodId: string }
  | { action: "create_session"; plan: PlanId; saveCard: boolean };

interface Quote {
  kind: "join" | "upgrade";
  due_cents: number;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function productName(plan: PlanId, kind: Quote["kind"]) {
  const label = plan === "annual" ? "Annual membership" : "Monthly membership";
  return kind === "upgrade" ? `LuxePass ${label} · switch from monthly` : `LuxePass ${label}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireCaller(req);
    const body = (await req.json()) as RequestBody;

    if (body.plan !== "monthly" && body.plan !== "annual") {
      return json({ error: "Unknown plan" }, 400);
    }

    const { data: quoteRows, error: quoteError } = await getCallerClient(req).rpc("membership_change_quote", {
      p_plan: body.plan,
    });
    if (quoteError) return json({ error: quoteError.message }, 400);
    const quote = (quoteRows as Quote[])[0]!;

    const stripe = getStripeClient();
    const service = getServiceClient();
    const customerId = await ensureStripeCustomer(service, stripe, caller.id, caller.email);
    const metadata = { kind: "membership", member_id: caller.id, plan: body.plan, change: quote.kind };

    if (body.action === "create_session") {
      const session = await stripe.checkout.sessions.create({
        ui_mode: "elements",
        mode: "payment",
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: productName(body.plan, quote.kind) },
              unit_amount: quote.due_cents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: body.saveCard ? { setup_future_usage: "off_session" } : undefined,
        metadata,
        return_url: `${Deno.env.get("APP_URL")}/profile/membership`,
      });

      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

      const { data: payment, error } = await service
        .from("payments")
        .insert({
          member_id: caller.id,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          amount_cents: quote.due_cents,
          currency: "usd",
          status: "pending",
          membership_plan: body.plan,
        })
        .select("id")
        .single();
      if (error) throw error;

      return json({ clientSecret: session.client_secret, paymentId: payment.id });
    }

    if (body.action === "charge_saved") {
      if (!body.paymentMethodId) return json({ error: "Missing payment method" }, 400);

      let paymentIntent: Stripe.PaymentIntent;
      let declineMessage: string | null = null;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: quote.due_cents,
          currency: "usd",
          customer: customerId,
          payment_method: body.paymentMethodId,
          confirm: true,
          off_session: false,
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          description: productName(body.plan, quote.kind),
          metadata,
        });
      } catch (error) {
        if (error instanceof Stripe.errors.StripeCardError) {
          paymentIntent = error.payment_intent as Stripe.PaymentIntent;
          declineMessage = error.message;
        } else {
          throw error;
        }
      }

      const status = paymentIntent.status === "succeeded" ? "succeeded" : "failed";

      const { data: payment, error: insertError } = await service
        .from("payments")
        .insert({
          member_id: caller.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: quote.due_cents,
          currency: "usd",
          status,
          membership_plan: body.plan,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      return json({ paymentId: payment.id, status, error: declineMessage });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
