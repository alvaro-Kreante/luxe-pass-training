import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 10.6 — el partner fijo, el usuario y la elección de lounge del
 * dashboard, de `partner_context()` (`supabase/schemas/partners.sql`). La
 * elección se guarda en la cuenta (`partner_members`), así que se recupera
 * en cualquier dispositivo.
 */

export interface PartnerLounge {
  id: string;
  name: string;
  neighborhood: string;
  contentStatus: "live" | "draft" | "archived" | "suspended";
}

export interface PartnerContext {
  partner: { id: string; name: string };
  user: { firstName: string; lastName: string };
  lounges: PartnerLounge[];
  /** Siempre un lounge concreto (Today y el check-in); null si el partner no tiene ninguno. */
  selectedLoungeId: string | null;
  /** "All lounges" en Analytics, Guests y Reports. */
  allLounges: boolean;
}

export async function loadPartnerContext(supabase: SupabaseClient): Promise<PartnerContext | null> {
  const { data, error } = await supabase.rpc("partner_context");
  if (error || !data) return null;
  type Raw = {
    partner: { id: string; name: string };
    user: { first_name: string; last_name: string };
    lounges: { id: string; name: string; neighborhood: string; content_status: PartnerLounge["contentStatus"] }[];
    selected_lounge_id: string | null;
    all_lounges: boolean;
  };
  const raw = data as Raw;
  return {
    partner: raw.partner,
    user: { firstName: raw.user.first_name, lastName: raw.user.last_name },
    lounges: raw.lounges.map((l) => ({ id: l.id, name: l.name, neighborhood: l.neighborhood, contentStatus: l.content_status })),
    selectedLoungeId: raw.selected_lounge_id,
    allLounges: raw.all_lounges,
  };
}

/** `null` = "All lounges". Un lounge que no es del partner se rechaza. */
export async function selectPartnerLounge(supabase: SupabaseClient, loungeId: string | null): Promise<void> {
  const { error } = await supabase.rpc("partner_select_lounge", { p_lounge_id: loungeId });
  if (error) throw new Error(error.message);
}

/** El lounge sobre el que filtran Analytics, Guests y Reports: null es "All lounges". */
export function analyticsLoungeId(context: PartnerContext | null): string | null {
  if (!context || context.allLounges) return null;
  return context.selectedLoungeId;
}
