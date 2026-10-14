import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 4.2 — Payment Processing, conectada a Stripe real (modo test). Cada
 * función envuelve una Edge Function (`supabase/functions/stripe-*`) — ver
 * `CLAUDE.md` §Procesamiento de pagos (Stripe) para la arquitectura
 * completa. `supabase.functions.invoke` ya adjunta el JWT de la sesión
 * actual, así que estas funciones no necesitan tocarlo.
 */

export interface CardChargeRequest {
  loungeId: string;
  dateIso: string;
  band: string;
  slotTime: string;
  specialRequests: string;
}

export interface CheckoutSessionResult {
  clientSecret: string;
  paymentId: string;
}

/** AC "Support for major credit/debit cards" — tarjeta nueva, vía Payment Element. */
export async function createCheckoutSession(
  supabase: SupabaseClient,
  request: CardChargeRequest & { saveCard: boolean },
): Promise<CheckoutSessionResult> {
  const { data, error } = await supabase.functions.invoke("stripe-create-checkout-session", {
    body: request,
  });
  if (error) throw error;
  return data as CheckoutSessionResult;
}

export interface SavedChargeResult {
  paymentId: string;
  status: "succeeded" | "failed";
  error: string | null;
}

/** AC "Payment method storage for future use" — cobra con una tarjeta ya guardada. */
export async function chargeSavedPaymentMethod(
  supabase: SupabaseClient,
  /** `idempotencyKey`: uno por intento de pago — repetirlo devuelve el mismo cobro (E2E-01). */
  request: CardChargeRequest & { paymentMethodId: string; idempotencyKey: string },
): Promise<SavedChargeResult> {
  const { data, error } = await supabase.functions.invoke("stripe-charge-saved-method", {
    body: request,
  });
  if (error) throw error;
  return data as SavedChargeResult;
}

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export async function listSavedPaymentMethods(
  supabase: SupabaseClient,
): Promise<SavedPaymentMethod[]> {
  const { data, error } = await supabase.functions.invoke("stripe-payment-methods", {
    body: { action: "list" },
  });
  if (error) throw error;
  return (data as { methods: SavedPaymentMethod[] }).methods;
}

export async function removeSavedPaymentMethod(
  supabase: SupabaseClient,
  paymentMethodId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke("stripe-payment-methods", {
    body: { action: "remove", paymentMethodId },
  });
  if (error) throw error;
}
