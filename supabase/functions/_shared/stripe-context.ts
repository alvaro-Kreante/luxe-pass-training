// Story 4.2 — helpers compartidos por las Edge Functions de Stripe
// (`stripe-create-checkout-session`, `stripe-charge-saved-method`,
// `stripe-payment-methods`). El webhook (`stripe-webhook`) no los usa: no
// tiene un usuario autenticado, solo la firma de Stripe.

import Stripe from "npm:stripe@22.6.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export function getStripeClient(): Stripe {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
    apiVersion: "2026-08-26.dahlia",
  });
}

/** Cliente con la sesión del miembro que llama — solo para resolver quién es. */
export function getCallerClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_ANON_KEY") as string,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
}

/** Service role — bypassa RLS, para las escrituras propias de estas functions. */
export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

export async function requireCaller(
  req: Request,
): Promise<{ id: string; email: string }> {
  const { data, error } = await getCallerClient(req).auth.getUser();
  if (error || !data.user?.email) {
    throw new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { id: data.user.id, email: data.user.email };
}

/**
 * Un Customer de Stripe por miembro, creado la primera vez que hace falta
 * (ver `supabase/schemas/profiles.sql`). `service` debe ser el cliente de
 * service role — la escritura en `profiles.stripe_customer_id` no pasa por
 * ninguna policy de RLS (no hay ninguna que lo permita a un miembro).
 */
export async function ensureStripeCustomer(
  service: SupabaseClient,
  stripe: Stripe,
  memberId: string,
  email: string,
): Promise<string> {
  const { data, error } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", memberId)
    .single();
  if (error) throw error;

  if (data.stripe_customer_id) return data.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { member_id: memberId },
  });

  const { error: updateError } = await service
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", memberId);
  if (updateError) throw updateError;

  return customer.id;
}

/**
 * Precio de un day pass (Story 4.2) — debe coincidir con `DAY_PASS_PRICE`/
 * `TAX_RATE` de `src/lib/booking.ts`. SQL/Deno no pueden leer esas
 * constantes de TS del proyecto Next.js, igual que ya pasa con
 * `check_login_lock` y `MAX_FAILED_ATTEMPTS`.
 */
export const DAY_PASS_PRICE = 75;
export const TAX_RATE = 0.08875;

export function dayPassAmountCents(): number {
  return Math.round(DAY_PASS_PRICE * (1 + TAX_RATE) * 100);
}
