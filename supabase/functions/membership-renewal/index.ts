// Story 9.1 — renovación de membresía, disparada por el paso del tiempo:
// `dispatch_membership_renewals()` (pg_cron diario, ver
// supabase/schemas/memberships.sql) llama aquí con dos tipos de evento,
// igual que `send-partner-booking-event` distingue los suyos por `type`:
//
//   - `notice`: "notice a month in advance" (flow) / `Main.dc.html` "We
//     email you on October 3 — a month before" — email vía Brevo a los
//     anuales con auto-renovación que entran en su último mes.
//   - `charge`: el término acabó y la auto-renovación está encendida — cobra
//     off-session la tarjeta guardada del miembro (decisión del usuario, 23
//     sept 2026: "por algo es renovación automática"; sin Stripe Billing,
//     mismo PaymentIntent que el resto del proyecto). Cobra `pending_plan`
//     si hay un paso a mensual programado. El término siguiente lo abre el
//     trigger `apply_membership_payment` al insertar el pago 'succeeded';
//     si no hay tarjeta o el cobro falla, la membresía vence y se avisa.
//
// Mismo motivo de `x-webhook-secret` en vez de `verify_jwt` que
// send-booking-reminder: quien llama es Postgres, no un miembro autenticado.
//
// Ningún artboard dibuja el email del aviso (solo la promesa en pantalla) —
// mismo esqueleto sobrio que `send-booking-reminder`, anotado como
// desviación en docs/design/COMPONENT-MAP.md.
import Stripe from "npm:stripe@22.6.0";

import { sendBrevoEmail } from "../_shared/brevo.ts";
import { getServiceClient, getStripeClient } from "../_shared/stripe-context.ts";

const webhookSecret = Deno.env.get("MEMBERSHIP_RENEWAL_WEBHOOK_SECRET") as string;

type PlanId = "monthly" | "annual";

/** Deben coincidir con `MONTHLY_PRICE`/`ANNUAL_PRICE` de `src/lib/membership.ts` y `membership_change_quote`. */
const PLAN_PRICE_CENTS: Record<PlanId, number> = { monthly: 24900, annual: 240000 };
const PLAN_PRICE_LABEL: Record<PlanId, string> = { monthly: "$249.00", annual: "$2,400.00" };

interface WebhookPayload {
  type: "notice" | "charge";
  record: { member_id: string };
}

interface MembershipRow {
  member_id: string;
  plan: PlanId;
  status: "active" | "expired";
  current_period_end: string;
  auto_renew: boolean;
  pending_plan: PlanId | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function renderRenewalHtml(input: {
  memberFirstName: string;
  renewsOn: string;
  switchingToMonthly: boolean;
  appUrl: string;
}): string {
  const body = input.switchingToMonthly
    ? `your annual LuxePass term ends in a month. From then you move to the monthly plan, ${PLAN_PRICE_LABEL.monthly} a month, charged to the card on your membership.`
    : `your annual LuxePass membership renews in a month, for another year at ${PLAN_PRICE_LABEL.annual}. Nothing to do if you want to keep it.`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">Your membership</p>
      <h1 style="font-size:24px;color:#1a1a1a;">Renews on ${input.renewsOn}</h1>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">${input.memberFirstName}, ${body}</p>
      <p style="font-size:14px;color:#4a4a4a;line-height:1.6;">
        To change the plan, or turn auto-renewal off, go to
        <a href="${input.appUrl}/profile/membership" style="color:#AD8A5C;">Profile › Membership</a>.
      </p>
    </div>
  `;
}

async function sendNotice(membership: MembershipRow): Promise<Response> {
  const service = getServiceClient();
  const [{ data: authUser, error: authError }, { data: profile }] = await Promise.all([
    service.auth.admin.getUserById(membership.member_id),
    service.from("profiles").select("full_name").eq("id", membership.member_id).maybeSingle(),
  ]);

  if (authError || !authUser.user?.email) {
    return json({ error: { message: `could not resolve member: ${authError?.message}` } }, 500);
  }

  const memberFirstName = (profile?.full_name ?? authUser.user.email.split("@")[0]).split(" ")[0]!;
  const renewsOn = formatLongDate(membership.current_period_end);

  try {
    await sendBrevoEmail(
      authUser.user.email,
      `Your LuxePass membership renews on ${renewsOn}`,
      renderRenewalHtml({
        memberFirstName,
        renewsOn,
        switchingToMonthly: membership.pending_plan === "monthly",
        appUrl: Deno.env.get("APP_URL") as string,
      }),
    );
  } catch (error) {
    return json({ error: { message: error instanceof Error ? error.message : "brevo error" } }, 500);
  }

  return json({});
}

/** Sin tarjeta o con el cobro rechazado: la membresía vence (no se regala un término) y se avisa. */
async function failRenewal(membership: MembershipRow, plan: PlanId, reason: string): Promise<Response> {
  const service = getServiceClient();
  await service
    .from("memberships")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("member_id", membership.member_id);
  await service.from("notifications").insert({
    member_id: membership.member_id,
    category: "membership",
    icon: "membership",
    title: "We couldn't renew your membership",
    body: `The ${plan} renewal could not be charged to a card on your account, so your membership has ended. Choose a plan again from Profile › Membership.`,
  });
  return json({ status: "failed", reason });
}

async function chargeRenewal(memberId: string): Promise<Response> {
  const service = getServiceClient();

  // Se vuelve a leer la fila en vez de fiarse del payload del cron: la
  // auto-renovación pudo apagarse, o el término renovarse ya, entre medias.
  const { data: membership, error } = await service
    .from("memberships")
    .select("member_id, plan, status, current_period_end, auto_renew, pending_plan")
    .eq("member_id", memberId)
    .maybeSingle<MembershipRow>();
  if (error) return json({ error: { message: error.message } }, 500);

  if (
    !membership ||
    membership.status !== "active" ||
    !membership.auto_renew ||
    Date.parse(membership.current_period_end) > Date.now()
  ) {
    return json({ error: { message: "Nothing to renew" } }, 409);
  }

  const plan = membership.pending_plan ?? membership.plan;
  const amountCents = PLAN_PRICE_CENTS[plan];

  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", memberId)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (!profile?.stripe_customer_id) return failRenewal(membership, plan, "no_payment_method");

  const stripe = getStripeClient();
  const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
  const defaultMethod =
    !customer.deleted && typeof customer.invoice_settings.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : null;
  const paymentMethodId =
    defaultMethod ??
    (await stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: "card", limit: 1 })).data[0]?.id;
  if (!paymentMethodId) return failRenewal(membership, plan, "no_payment_method");

  let paymentIntent: Stripe.PaymentIntent | null = null;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `LuxePass ${plan === "annual" ? "Annual" : "Monthly"} membership · renewal`,
      metadata: { kind: "membership_renewal", member_id: memberId, plan },
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError) {
      paymentIntent = (error.payment_intent as Stripe.PaymentIntent | undefined) ?? null;
    } else {
      throw error;
    }
  }

  const succeeded = paymentIntent?.status === "succeeded";

  if (paymentIntent) {
    const { data: payment, error: insertError } = await service
      .from("payments")
      .insert({
        member_id: memberId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        currency: "usd",
        status: succeeded ? "succeeded" : "failed",
        membership_plan: plan,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    if (succeeded) return json({ status: "succeeded", paymentId: payment.id });
  }

  return failRenewal(membership, plan, "charge_failed");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  if (req.headers.get("x-webhook-secret") !== webhookSecret) {
    return json({ error: { message: "invalid webhook secret" } }, 401);
  }

  try {
    const { type, record } = (await req.json()) as WebhookPayload;

    if (type === "charge") return await chargeRenewal(record.member_id);

    if (type === "notice") {
      const { data: membership } = await getServiceClient()
        .from("memberships")
        .select("member_id, plan, status, current_period_end, auto_renew, pending_plan")
        .eq("member_id", record.member_id)
        .maybeSingle<MembershipRow>();
      if (!membership) return json({ error: { message: "membership not found" } }, 404);
      return await sendNotice(membership);
    }

    return json({ error: { message: "unknown type" } }, 400);
  } catch (error) {
    return json({ error: { message: error instanceof Error ? error.message : "Unknown error" } }, 500);
  }
});
