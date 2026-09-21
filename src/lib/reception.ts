import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Story 5.2 — Lounge Check-In Process (`Reception.dc.html` /
 * `CheckInError.dc.html`). RPC "de kiosco" contra Supabase (ver
 * `supabase/schemas/bookings.sql`): `/reception` no inicia sesión de
 * personal ni de miembro — autorizado solo por conocer el LP# de hoy en el
 * lounge correcto, igual que un lector físico de QR. `dateIso` es siempre
 * el "hoy" de mockup del proyecto (`TODAY`, `src/lib/availability.ts`), no
 * la fecha real del navegador — mismo motivo que `confirm_booking` recibe
 * `p_date` en vez de asumirlo.
 */

export interface ReceptionBooking {
  id: string;
  reference: string;
  memberName: string;
  memberEmail: string;
  arrivalTime: string;
  specialRequests: string;
  status: string;
  checkedInAt: string | null;
  noShow: boolean;
  /** "Miriam Rivas · sister · +1 (555) 402-7788", o null si el miembro no lo dio de alta (Story 6.3, sin conectar). */
  emergencyContact: string | null;
}

interface ReceptionBookingRow {
  id: string;
  confirmation_code: string;
  member_name: string;
  member_email: string;
  slot_time: string;
  special_requests: string;
  status: string;
  checked_in_at: string | null;
  no_show: boolean;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
}

function emergencyContactLabel(row: ReceptionBookingRow): string | null {
  if (!row.emergency_contact_name) return null;

  return [row.emergency_contact_name, row.emergency_contact_relation, row.emergency_contact_phone]
    .filter(Boolean)
    .join(" · ");
}

function fromRow(row: ReceptionBookingRow): ReceptionBooking {
  return {
    id: row.id,
    reference: row.confirmation_code,
    memberName: row.member_name,
    memberEmail: row.member_email,
    arrivalTime: row.slot_time,
    specialRequests: row.special_requests,
    status: row.status,
    checkedInAt: row.checked_in_at,
    noShow: row.no_show,
    emergencyContact: emergencyContactLabel(row),
  };
}

/** AC "Instant verification of booking validity" — solo lectura, no cambia nada. */
export async function lookupReceptionBooking(
  supabase: SupabaseClient,
  loungeId: string,
  dateIso: string,
  code: string,
): Promise<ReceptionBooking | null> {
  const { data, error } = await supabase
    .rpc("reception_lookup_booking", {
      p_lounge_id: loungeId,
      p_date: dateIso,
      p_confirmation_code: code,
    })
    .maybeSingle();

  if (error) throw error;

  return data ? fromRow(data as ReceptionBookingRow) : null;
}

/** AC "Check-in confirmation to member's app" — el miembro lo ve al recargar /my-pass (src/lib/passes.ts). */
export async function checkInReceptionBooking(
  supabase: SupabaseClient,
  loungeId: string,
  dateIso: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.rpc("reception_checkin_booking", {
    p_lounge_id: loungeId,
    p_date: dateIso,
    p_confirmation_code: code,
  });

  if (error) throw error;
}

/** AC "No-show tracking for booking history". */
export async function reportReceptionNoShow(
  supabase: SupabaseClient,
  loungeId: string,
  dateIso: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.rpc("reception_report_no_show", {
    p_lounge_id: loungeId,
    p_date: dateIso,
    p_confirmation_code: code,
  });

  if (error) throw error;
}

export interface ReceptionTodaySummary {
  expected: number;
  checkedIn: number;
}

export async function fetchReceptionTodaySummary(
  supabase: SupabaseClient,
  loungeId: string,
  dateIso: string,
): Promise<ReceptionTodaySummary> {
  const { data, error } = await supabase
    .rpc("reception_today_summary", { p_lounge_id: loungeId, p_date: dateIso })
    .single();

  if (error) throw error;

  const row = data as { expected: number; checked_in: number };
  return { expected: row.expected, checkedIn: row.checked_in };
}

/**
 * "Close matches for today" de `CheckInError.dc.html` — no es un AC de la
 * Story 5.2 (nada pide una búsqueda difusa por nombre/email), así que sigue
 * siendo dato de muestra. Ver desviación en docs/design/COMPONENT-MAP.md.
 */
export interface ReceptionCloseMatch {
  reference: string;
  memberName: string;
  memberInitials: string;
  note: string;
}

export const RECEPTION_CLOSE_MATCHES: ReceptionCloseMatch[] = [
  {
    reference: "LP-000917",
    memberName: "Marcus Vidal",
    memberInitials: "MV",
    note: "Arrival 4:00 PM · not arrived yet",
  },
];
