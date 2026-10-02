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
  /** Story 10.12 — para buscar por dirección y ciudad. */
  address: string;
  city: string;
  contentStatus: "live" | "draft" | "archived" | "suspended";
  /** Solo si está suspendido: suelto ('admin') o con su partner ('partner'). */
  suspendedBy: "admin" | "partner" | null;
  capacity: number;
}

export interface AdminPartnerDetail extends PartnerDetailsInput {
  id: string;
  status: PartnerStatus;
  createdAt: string;
  activatedAt: string | null;
  suspendedAt: string | null;
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
    activated_at: string | null;
    suspended_at: string | null;
    users: { id: string; first_name: string; last_name: string; email: string; mobile: string; status: PartnerMemberStatus; is_representative: boolean }[];
    lounges: { id: string; name: string; area: string; address: string; city: string; content_status: AdminPartnerLounge["contentStatus"]; suspended_by: AdminPartnerLounge["suspendedBy"]; capacity: number }[];
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
    activatedAt: raw.activated_at,
    suspendedAt: raw.suspended_at,
    users: raw.users.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      mobile: u.mobile,
      status: u.status,
      isRepresentative: u.is_representative,
    })),
    lounges: raw.lounges.map((l) => ({
      id: l.id,
      name: l.name,
      area: l.area,
      address: l.address,
      city: l.city,
      contentStatus: l.content_status,
      suspendedBy: l.suspended_by,
      capacity: l.capacity,
    })),
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

async function invoke<T = Record<string, unknown>>(supabase: SupabaseClient, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-partners", { body });
  if (!error) return data as T;
  const detail = error.context instanceof Response ? await error.context.json().catch(() => null) : null;
  throw new Error(detail?.error ?? error.message);
}

/**
 * El primero que se añade queda como representante. En un partner activo
 * recibe la invitación al momento (Story 10.4). Devuelve el id del usuario.
 */
export async function addPartnerMember(supabase: SupabaseClient, partnerId: string, input: PartnerMemberInput): Promise<string> {
  const { memberId } = await invoke<{ memberId: string }>(supabase, { action: "add_member", partnerId, member: input });
  return memberId;
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

/** Con cuenta, la borra también. El representante no se borra mientras queden otros. */
export async function deletePartnerMember(supabase: SupabaseClient, memberId: string): Promise<void> {
  await invoke(supabase, { action: "delete_member", memberId });
}

/* Story 10.4 — acceso (Edge Function `admin-partners`) y suspensión. */

/** PartnerActivate.dc.html (5) — exige al menos un usuario; cada uno recibe el email de crear contraseña. */
export async function activatePartner(supabase: SupabaseClient, partnerId: string): Promise<void> {
  await invoke(supabase, { action: "activate", partnerId });
}

/** Solo a quien aún no creó su contraseña. */
export async function resendPartnerMemberInvite(supabase: SupabaseClient, memberId: string): Promise<void> {
  await invoke(supabase, { action: "resend", memberId });
}

export async function suspendPartnerMember(supabase: SupabaseClient, memberId: string): Promise<void> {
  await invoke(supabase, { action: "suspend_member", memberId });
}

export async function reactivatePartnerMember(supabase: SupabaseClient, memberId: string): Promise<void> {
  await invoke(supabase, { action: "reactivate_member", memberId });
}

/** PartnerSuspend.dc.html (7) — suspende sus lounges publicados y bloquea a todos sus usuarios. */
export async function suspendPartner(supabase: SupabaseClient, partnerId: string): Promise<void> {
  await invoke(supabase, { action: "suspend_partner", partnerId });
}

/** PartnerSuspended.dc.html (8) — lo que era live vuelve a draft; lo suspendido a mano sigue igual. */
export async function reactivatePartner(supabase: SupabaseClient, partnerId: string): Promise<void> {
  await invoke(supabase, { action: "reactivate_partner", partnerId });
}

/** LoungeSuspend.dc.html (11) — sale del catálogo y deja de aceptar reservas. */
export async function suspendLounge(supabase: SupabaseClient, loungeId: string): Promise<void> {
  await rpc(supabase, "admin_suspend_lounge", { p_lounge_id: loungeId });
}

/** Vuelve a draft para revisarlo y publicarlo de nuevo. */
export async function reactivateLounge(supabase: SupabaseClient, loungeId: string): Promise<void> {
  await rpc(supabase, "admin_reactivate_lounge", { p_lounge_id: loungeId });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El mismo criterio que el servidor: nombre, apellido y un email válido; el móvil es opcional. */
export function isPartnerMemberComplete(member: PartnerMemberInput): boolean {
  return member.firstName.trim() !== "" && member.lastName.trim() !== "" && EMAIL.test(member.email.trim());
}
