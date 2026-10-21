import type { SupabaseClient } from "@supabase/supabase-js";

import { hasDashboardAccess, loadPartnerContext } from "@/lib/partner-lounges";

/**
 * Story 1.2 — constantes del acceso.
 *
 * El acceso y el bloqueo son reales (Supabase Auth + RPC `login_attempts`,
 * ver `supabase/schemas/login_attempts.sql`); estas cifras solo alimentan la
 * copy de `/login` y deben coincidir con las que usan las funciones SQL.
 */

/** Criterio: "Account lockout after 5 failed attempts (15min timeout)". */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

/** Criterio: "Automatic logout after 30 days of inactivity". */
export const REMEMBER_ME_DAYS = 30;

/**
 * Login unificado — `/login` también recibe a partners y admins y los manda
 * a su dashboard (cada cuenta tiene un solo rol). Un partner sin acceso al
 * dashboard (Story 10.1, suspendido) devuelve `"suspended"`.
 */
export async function resolveLoginDestination(
  supabase: SupabaseClient,
): Promise<"/" | "/partner" | "/admin/support" | "suspended"> {
  const { data: isAdmin } = await supabase.rpc("has_role", { p_role: "admin" });
  if (isAdmin) return "/admin/support";

  const { data: isPartner } = await supabase.rpc("has_role", { p_role: "partner" });
  if (isPartner) {
    return hasDashboardAccess(await loadPartnerContext(supabase)) ? "/partner" : "suspended";
  }

  return "/";
}
