import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 10.1 — los lounges del partner del usuario autenticado, de
 * `partner_lounge_ids()` (`supabase/schemas/partners.sql`). Hasta el
 * selector de la Story 10.6, el dashboard abre el primero.
 */
export async function firstPartnerLoungeId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.rpc("partner_lounge_ids");
  if (error) return null;
  return ((data as string[] | null) ?? [])[0] ?? null;
}
