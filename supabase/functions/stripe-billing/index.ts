// "Invoices and receipts" (`Receipts.dc.html`) y "Update" de la tarjeta.
//   - `receipt_urls`: el recibo de Stripe de cada cargo del miembro, por
//     `payment_intent`. Los cobros no generan facturas (PaymentIntents y
//     Checkout en modo `payment`), pero cada cargo tiene su `receipt_url`.
//     La lista de pagos la lee el cliente de `payments` (RLS).
//   - `portal`: sesión del Customer Portal de Stripe, solo para cambiar el
//     método de pago — sin historial de facturas (no hay), sin cancelar ni
//     cambiar plan (eso vive en LuxePass).
import Stripe from "npm:stripe@22.6.0";

import { corsHeaders } from "../_shared/cors.ts";
import {
  ensureStripeCustomer,
  getServiceClient,
  getStripeClient,
  requireCaller,
} from "../_shared/stripe-context.ts";

type RequestBody =
  | { action: "receipt_urls" }
  | { action: "portal"; returnUrl: string };

const PORTAL_CONFIGURATION_TAG = "luxepass-payment-method-only";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** La configuración del portal se crea una vez por cuenta de Stripe y se reutiliza (marcada por metadata). */
async function portalConfigurationId(stripe: Stripe): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const found = existing.data.find((config) => config.metadata?.app === PORTAL_CONFIGURATION_TAG);
  if (found) return found.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "LuxePass — update your card" },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: false },
      customer_update: { enabled: false },
      subscription_cancel: { enabled: false },
    },
    metadata: { app: PORTAL_CONFIGURATION_TAG },
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireCaller(req);
    const body = (await req.json()) as RequestBody;
    const stripe = getStripeClient();
    const customerId = await ensureStripeCustomer(getServiceClient(), stripe, caller.id, caller.email);

    if (body.action === "receipt_urls") {
      const receiptUrls: Record<string, string> = {};
      for await (const charge of stripe.charges.list({ customer: customerId, limit: 100 })) {
        const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (intentId && charge.receipt_url) receiptUrls[intentId] = charge.receipt_url;
      }
      return json({ receiptUrls });
    }

    if (body.action === "portal") {
      // Solo de vuelta a la propia app: el origen lo pone el navegador, no el cuerpo.
      const origin = req.headers.get("origin");
      const returnUrl = origin && body.returnUrl.startsWith(origin) ? body.returnUrl : origin ?? body.returnUrl;
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        configuration: await portalConfigurationId(stripe),
        return_url: returnUrl,
      });
      return json({ url: session.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
