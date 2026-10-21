import type { SupabaseClient } from "@supabase/supabase-js";

import { SLOT_DEFS } from "@/lib/booking";

/**
 * Story 8.4 — Bookings Overview. Un día de reservas de toda la red
 * (`admin_bookings_on`, `supabase/schemas/support_tickets.sql`); lounge,
 * estado y búsqueda se filtran aquí, sobre ese día.
 */

export type BookingState = "confirmed" | "checked-in" | "no-show" | "cancelled";

export interface NetworkBooking {
  id: string;
  reference: string;
  memberId: string;
  memberName: string;
  loungeId: string;
  loungeName: string;
  loungeArea: string;
  date: string;
  band: string;
  slotTime: string;
  state: BookingState;
  isDayPass: boolean;
  amountPaid: number;
}

export interface BookingsLounge {
  id: string;
  name: string;
  capacity: number;
  bands: string[];
  partnerId: string | null;
  partnerName: string | null;
}

interface AdminBookingRow {
  id: string;
  confirmation_code: string;
  member_id: string;
  member_name: string;
  lounge_id: string;
  lounge_name: string;
  lounge_area: string;
  date: string;
  band: string;
  slot_time: string;
  status: string;
  no_show: boolean;
  is_day_pass: boolean;
  amount_paid_cents: number;
}

export const BOOKING_STATES: { id: BookingState; label: string }[] = [
  { id: "confirmed", label: "Confirmed" },
  { id: "checked-in", label: "Checked in" },
  { id: "no-show", label: "No-show" },
  { id: "cancelled", label: "Cancelled" },
];

/** `completed` sin no-show es una visita atendida: cuenta como "checked in". */
export function bookingState(status: string, noShow: boolean): BookingState {
  if (status === "cancelled") return "cancelled";
  if (noShow) return "no-show";
  if (status === "in_progress" || status === "completed") return "checked-in";
  return "confirmed";
}

export async function fetchBookingsOn(supabase: SupabaseClient, date: string): Promise<NetworkBooking[]> {
  const { data, error } = await supabase.rpc("admin_bookings_on", { p_date: date });
  if (error) throw error;

  return ((data ?? []) as AdminBookingRow[]).map((row) => ({
    id: row.id,
    reference: row.confirmation_code,
    memberId: row.member_id,
    memberName: row.member_name,
    loungeId: row.lounge_id,
    loungeName: row.lounge_name,
    loungeArea: row.lounge_area,
    date: row.date,
    band: row.band,
    slotTime: row.slot_time,
    state: bookingState(row.status, row.no_show),
    isDayPass: row.is_day_pass,
    amountPaid: row.amount_paid_cents / 100,
  }));
}

export async function fetchBookingsLounges(supabase: SupabaseClient): Promise<BookingsLounge[]> {
  const { data, error } = await supabase
    .from("lounges")
    .select("id, name, capacity, bands, partner_id, partners(name)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const partner = row.partners as unknown as { name: string } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      capacity: row.capacity as number,
      bands: row.bands as string[],
      partnerId: (row.partner_id as string | null) ?? null,
      partnerName: partner?.name ?? null,
    };
  });
}

export function filterBookings(
  bookings: NetworkBooking[],
  { loungeIds, state, query }: { loungeIds: Set<string> | null; state: BookingState | null; query: string },
): NetworkBooking[] {
  const needle = query.trim().toLowerCase();
  return bookings.filter(
    (b) =>
      (!loungeIds || loungeIds.has(b.loungeId)) &&
      (!state || b.state === state) &&
      (!needle || b.memberName.toLowerCase().includes(needle) || b.reference.toLowerCase().includes(needle)),
  );
}

/** Grupos por hora de llegada, en el orden de `SLOT_DEFS`; solo las horas con reservas. */
export function groupByArrival(bookings: NetworkBooking[]): { time: string; bookings: NetworkBooking[] }[] {
  return SLOT_DEFS.map(({ time }) => ({ time, bookings: bookings.filter((b) => b.slotTime === time) })).filter(
    (group) => group.bookings.length > 0,
  );
}

const BAND_LABELS: Record<string, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

/** Plazas ocupadas por franja — misma regla que `booking_occupies_seat` (todo menos cancelada). */
export function bandOccupancy(
  bookings: NetworkBooking[],
  lounge: BookingsLounge,
): { band: string; label: string; taken: number; capacity: number }[] {
  return lounge.bands
    .filter((band) => band in BAND_LABELS)
    .map((band) => ({
      band,
      label: BAND_LABELS[band],
      taken: bookings.filter(
        (b) => b.loungeId === lounge.id && b.state !== "cancelled" && (b.band === band || (band === "evening" && b.band === "late")),
      ).length,
      capacity: lounge.capacity,
    }));
}

export function countByState(bookings: NetworkBooking[]): Record<BookingState, number> {
  const counts: Record<BookingState, number> = { confirmed: 0, "checked-in": 0, "no-show": 0, cancelled: 0 };
  for (const b of bookings) counts[b.state] += 1;
  return counts;
}
