import { createClient as createAdminClient } from "@supabase/supabase-js";

import type { PlanId } from "../membership";
import { attachTestCard, setDefaultPaymentMethod } from "./stripe-fixture";

/**
 * Solo para tests (Epic 9). `memberships` no admite escrituras de cliente —
 * nace de un pago real (trigger sobre `payments`) — así que los tests que
 * necesitan un miembro con plan ya activo lo siembran con el service role,
 * igual que `signUpConfirmedPartnerAndSignIn` siembra el alta operativa de
 * un partner.
 */
function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function grantTestMembership(
  memberId: string,
  plan: PlanId,
  options: { startedAt?: Date; periodStart?: Date; periodEnd?: Date; autoRenew?: boolean } = {},
) {
  const periodStart = options.periodStart ?? new Date();
  const periodEnd =
    options.periodEnd ??
    new Date(
      plan === "annual"
        ? Date.UTC(periodStart.getUTCFullYear() + 1, periodStart.getUTCMonth(), periodStart.getUTCDate())
        : Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, periodStart.getUTCDate()),
    );

  const { error } = await adminClient()
    .from("memberships")
    .upsert({
      member_id: memberId,
      plan,
      status: "active",
      started_at: (options.startedAt ?? periodStart).toISOString(),
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      auto_renew: options.autoRenew ?? true,
    });
  if (error) throw error;
}

/** Simula lo que el webhook de Stripe hace al liquidarse un pago (`stripe-webhook`): solo cambia `payments.status`. */
export async function settleTestPayment(paymentId: string) {
  const { error } = await adminClient()
    .from("payments")
    .update({ status: "succeeded", updated_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) throw error;
}

/** Un pago real ya liquidado de un miembro (p. ej. un day pass) — dispara los triggers de `payments`. */
export async function insertSucceededTestPayment(memberId: string, amountCents = 8166) {
  const { data, error } = await adminClient()
    .from("payments")
    .insert({ member_id: memberId, amount_cents: amountCents, status: "succeeded" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Un Customer de Stripe real (modo test) con `pm_card_visa` como tarjeta por
 * defecto, ligado al miembro — para que el modal de plan ofrezca "The card
 * already on your membership" sin montar `<PaymentElement>` (imposible en
 * jsdom). Misma tarjeta de prueba documentada que `attachTestCard`.
 */
export async function giveTestMemberSavedCard(memberId: string, email: string): Promise<string> {
  const res = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ email, "metadata[member_id]": memberId }),
  });
  const customer = (await res.json()) as { id?: string; error?: { message: string } };
  if (!customer.id) throw new Error(customer.error?.message ?? "Failed to create Stripe customer");

  const { error } = await adminClient().from("profiles").update({ stripe_customer_id: customer.id }).eq("id", memberId);
  if (error) throw error;

  const paymentMethodId = await attachTestCard(customer.id);
  await setDefaultPaymentMethod(customer.id, paymentMethodId);
  return paymentMethodId;
}
