import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Epic 10 — partners (organizaciones) desde el admin, vía las RPC de
 * `supabase/schemas/admin_partners.sql`.
 */

export type PartnerStatus = "draft" | "active" | "suspended";

export interface AdminPartnerRow {
  id: string;
  name: string;
  contactEmail: string;
  status: PartnerStatus;
  loungeCount: number;
  /** null si el partner aún no tiene usuarios. */
  representative: { name: string; email: string } | null;
  city: string;
}

/** Story 10.2 — el listado, el más nuevo primero. */
export async function listAdminPartners(supabase: SupabaseClient): Promise<AdminPartnerRow[]> {
  const { data, error } = await supabase.rpc("admin_partner_list");
  if (error) throw new Error(error.message);
  type Row = {
    id: string;
    name: string;
    contact_email: string;
    status: PartnerStatus;
    lounge_count: number;
    representative_name: string | null;
    representative_email: string | null;
    city: string;
  };
  return (data as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    contactEmail: row.contact_email,
    status: row.status,
    loungeCount: row.lounge_count,
    representative:
      row.representative_name !== null ? { name: row.representative_name, email: row.representative_email ?? "" } : null,
    city: row.city,
  }));
}
