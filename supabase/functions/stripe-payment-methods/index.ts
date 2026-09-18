// Story 4.2 — "Payment method storage for future use". Lista o quita
// tarjetas guardadas en el Customer de Stripe del miembro. Sustituye a
// `SAMPLE_PAYMENT_METHODS` (mock) en `payment-method-form.tsx`.
import { corsHeaders } from "../_shared/cors.ts";
import {
  ensureStripeCustomer,
  getServiceClient,
  getStripeClient,
  requireCaller,
} from "../_shared/stripe-context.ts";

type RequestBody =
  | { action: "list" }
  | { action: "remove"; paymentMethodId: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireCaller(req);
    const body = (await req.json()) as RequestBody;
    const stripe = getStripeClient();
    const service = getServiceClient();
    const customerId = await ensureStripeCustomer(service, stripe, caller.id, caller.email);

    if (body.action === "list") {
      const [customer, methods] = await Promise.all([
        stripe.customers.retrieve(customerId),
        stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      ]);
      const defaultId =
        !customer.deleted && typeof customer.invoice_settings.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : null;

      const cards = methods.data.map((method) => ({
        id: method.id,
        brand: method.card!.brand,
        last4: method.card!.last4,
        expMonth: method.card!.exp_month,
        expYear: method.card!.exp_year,
        isDefault: method.id === defaultId,
      }));

      return new Response(JSON.stringify({ methods: cards }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "remove") {
      const method = await stripe.paymentMethods.retrieve(body.paymentMethodId);
      if (method.customer !== customerId) {
        return new Response(JSON.stringify({ error: "Not your payment method" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await stripe.paymentMethods.detach(body.paymentMethodId);
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
