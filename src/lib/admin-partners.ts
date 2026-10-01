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

/** PartnerNew.dc.html — los datos del partner; el edificio central va en texto, sin mapa. */
export interface PartnerDetailsInput {
  name: string;
  contactEmail: string;
  addressLine1: string;
  addressLine2: string;
  /** La ciudad principal del listado. */
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface PartnerMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
}

/** 'on_activation' = sin cuenta todavía (partner en draft). */
export type PartnerMemberStatus = "on_activation" | "invited" | "active" | "suspended";

export interface AdminPartnerMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  status: PartnerMemberStatus;
  isRepresentative: boolean;
}

export interface AdminPartnerLounge {
  id: string;
  name: string;
  area: string;
  contentStatus: "live" | "draft" | "archived";
  capacity: number;
}

export interface AdminPartnerDetail extends PartnerDetailsInput {
  id: string;
  status: PartnerStatus;
  createdAt: string;
  users: AdminPartnerMember[];
  lounges: AdminPartnerLounge[];
}

function detailsPayload(input: PartnerDetailsInput) {
  return {
    name: input.name,
    contact_email: input.contactEmail,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2,
    city: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country: input.country,
  };
}

function memberPayload(input: PartnerMemberInput) {
  return { first_name: input.firstName, last_name: input.lastName, email: input.email, mobile: input.mobile };
}

async function rpc<T>(supabase: SupabaseClient, name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Story 10.3 — el partner con sus usuarios y sus lounges; null si no existe. */
export async function getAdminPartner(supabase: SupabaseClient, partnerId: string): Promise<AdminPartnerDetail | null> {
  type Raw = {
    id: string;
    name: string;
    contact_email: string;
    address_line1: string;
    address_line2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
    status: PartnerStatus;
    created_at: string;
    users: { id: string; first_name: string; last_name: string; email: string; mobile: string; status: PartnerMemberStatus; is_representative: boolean }[];
    lounges: { id: string; name: string; area: string; content_status: AdminPartnerLounge["contentStatus"]; capacity: number }[];
  };
  const raw = await rpc<Raw | null>(supabase, "admin_partner_detail", { p_partner_id: partnerId });
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    contactEmail: raw.contact_email,
    addressLine1: raw.address_line1,
    addressLine2: raw.address_line2,
    city: raw.city,
    region: raw.region,
    postalCode: raw.postal_code,
    country: raw.country,
    status: raw.status,
    createdAt: raw.created_at,
    users: raw.users.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      mobile: u.mobile,
      status: u.status,
      isRepresentative: u.is_representative,
    })),
    lounges: raw.lounges.map((l) => ({ id: l.id, name: l.name, area: l.area, contentStatus: l.content_status, capacity: l.capacity })),
  };
}

/**
 * Nace en draft, con sus primeros usuarios si los hay (el primero queda de
 * representante). Ninguno recibe nada hasta activarlo (Story 10.4).
 */
export function createPartnerDraft(
  supabase: SupabaseClient,
  input: PartnerDetailsInput,
  users: PartnerMemberInput[] = [],
): Promise<string> {
  return rpc<string>(supabase, "admin_create_partner", {
    p_partner: { ...detailsPayload(input), users: users.map(memberPayload) },
  });
}

export async function updatePartner(supabase: SupabaseClient, partnerId: string, input: PartnerDetailsInput): Promise<void> {
  await rpc(supabase, "admin_update_partner", { p_partner_id: partnerId, p_partner: detailsPayload(input) });
}

/** El primero que se añade queda como representante. Devuelve el id del usuario. */
export function addPartnerMember(supabase: SupabaseClient, partnerId: string, input: PartnerMemberInput): Promise<string> {
  return rpc<string>(supabase, "admin_add_partner_member", { p_partner_id: partnerId, p_member: memberPayload(input) });
}

/** El lápiz: nombre, apellido y móvil. El email es el inicio de sesión y no cambia. */
export async function updatePartnerMember(
  supabase: SupabaseClient,
  memberId: string,
  input: Omit<PartnerMemberInput, "email">,
): Promise<void> {
  await rpc(supabase, "admin_update_partner_member", {
    p_member_id: memberId,
    p_member: { first_name: input.firstName, last_name: input.lastName, mobile: input.mobile },
  });
}

export async function setPartnerRepresentative(supabase: SupabaseClient, partnerId: string, memberId: string): Promise<void> {
  await rpc(supabase, "admin_set_partner_representative", { p_partner_id: partnerId, p_member_id: memberId });
}

export async function deletePartnerMember(supabase: SupabaseClient, memberId: string): Promise<void> {
  await rpc(supabase, "admin_delete_partner_member", { p_member_id: memberId });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El mismo criterio que el servidor: nombre, apellido y un email válido; el móvil es opcional. */
export function isPartnerMemberComplete(member: PartnerMemberInput): boolean {
  return member.firstName.trim() !== "" && member.lastName.trim() !== "" && EMAIL.test(member.email.trim());
}
