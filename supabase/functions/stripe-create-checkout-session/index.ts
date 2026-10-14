// Story 4.2 — arranca el pago de un day pass cuando el miembro elige "Use a
// new card" en `Payment.dc.html`. Devuelve el `client_secret` de una
// Checkout Session en `ui_mode: "elements"` para montar `<PaymentElement>`
// en el cliente — el cargo real no ocurre aquí, ocurre cuando el miembro
// confirma en `/book/summary` (ver CLAUDE.md §Procesamiento de pagos).
import { corsHeaders } from "../_shared/cors.ts";
import {
  dayPassAmountCents,
  ensureStripeCustomer,
  getServiceClient,
  getStripeClient,
  requireCaller,
} from "../_shared/stripe-context.ts";

interface RequestBody {
  loungeId: string;
  dateIso: string;
  band: string;
  slotTime: string;
  specialRequests: string;
  saveCard: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const caller = await requireCaller(req);
    const body = (await req.json()) as RequestBody;

    if (!body.loungeId || !body.dateIso || !body.band || !body.slotTime) {
      return new Response(JSON.stringify({ error: "Missing booking details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = getStripeClient();
    const service = getServiceClient();
    const customerId = await ensureStripeCustomer(service, stripe, caller.id, caller.email);
    const amountCents = dayPassAmountCents();

    const session = await stripe.checkout.sessions.create({
      ui_mode: "elements",
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `LuxePass day pass · ${body.loungeId}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: body.saveCard ? { setup_future_usage: "off_session" } : undefined,
      metadata: {
        member_id: caller.id,
        lounge_id: body.loungeId,
        date: body.dateIso,
        band: body.band,
        slot_time: body.slotTime,
        special_requests: body.specialRequests ?? "",
      },
      return_url: `${Deno.env.get("APP_URL")}/lounges/${body.loungeId}/book/confirmed`,
      // SEC-02 — el mínimo que admite Stripe: una reserva confirmada con esta
      // sesión sin llegar a pagarla se cancela al caducar (stripe-webhook).
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    const { data: payment, error } = await service
      .from("payments")
      .insert({
        member_id: caller.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: amountCents,
        currency: "usd",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, paymentId: payment.id }),
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
