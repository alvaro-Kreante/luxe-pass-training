import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMISSION_COUNT, addMinutesToTime } from "./booking";
import { today, addDays, formatDateLabel, parseDate } from "./availability";

/**
 * Story 5.1 (Digital Pass Generation), 5.3 (Booking Reminder) — backend real
 * sobre `bookings`/`lounges`/`payments` (Supabase local, ver
 * `supabase/schemas/bookings.sql` "Backend real — Epic 5" en
 * `docs/design/COMPONENT-MAP.md`). El número de confirmación LP# ya es real
 * desde la Story 4.2/5.1 (columna generada `confirmation_code`,
 * `bookingReferenceFromId` en `booking.ts`) — este módulo añade el resto:
 * leer el pase, la lista de "My Pass" y las reservas pasadas desde
 * Supabase. La Story 5.2 (consola de recepción) vive en `lib/reception.ts`,
 * un módulo aparte porque sus RPC son "de kiosco" (sin sesión), muy
 * distintas de estas consultas con sesión de miembro.
 *
 * "Booking expires automatically after booking window" (AC de la Story
 * 5.1) sigue siendo la única desviación visual de este módulo: no hay
 * cron que mueva una reserva vencida a completed/no-show (esa
 * automatización es Epic 6, ver docs/PENDIENTES.md), así que los cuatro
 * estados del pase se siguen alcanzando por `?state=` en vez de por el
 * paso del tiempo — la diferencia con antes es que ahora pintan datos
 * reales, no la reserva de muestra fija.
 */

export const PASS_LIFECYCLE_STATES = ["upcoming", "today", "checked-in", "expired"] as const;

export type PassLifecycleState = (typeof PASS_LIFECYCLE_STATES)[number];

export function isPassLifecycleState(value: unknown): value is PassLifecycleState {
  return (
    typeof value === "string" &&
    (PASS_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

/** Duración fija de una visita — ninguna historia pide que varíe por lounge o por reserva. */
export const VISIT_WINDOW_HOURS = 4;

/* ------------------------------------------------------------------ */
/* Formato compartido                                                  */
/* ------------------------------------------------------------------ */

function formatFullDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDate(dateIso));
}

function formatMonthDay(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDate(dateIso));
}

/** `checked_in_at`/`created_at` son instantes reales (timestamptz) — se muestran como hora, igual que el resto de la app trata sus timestamps (UTC, sin huso real). */
function formatClockTime(instantIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(instantIso));
}

/* ------------------------------------------------------------------ */
/* El pase digital — Story 5.1                                         */
/* ------------------------------------------------------------------ */

export interface DigitalPass {
  reference: string;
  memberName: string;
  memberEmail: string;
  loungeName: string;
  /** Story 10.8 — el partner del lounge, junto a la dirección; null si no tiene. */
  partnerName: string | null;
  address: string;
  receptionNote: string;
  dateLabel: string;
  /** "Sat, Sep 14" */
  shortDateLabel: string;
  /** "September 14" — pie del QR atenuado en el estado expirado. */
  monthDayLabel: string;
  arrivalTime: string;
  windowCloseTime: string;
  stayHours: number;
  admission: string;
  bookedOnLabel: string;
  amountPaidLabel: string;
  specialRequests: string;
  /** Hora formateada, o `null` si todavía no se hizo check-in. */
  checkedInAt: string | null;
  status: string;
  noShow: boolean;
}

interface LoungeEmbed {
  name: string;
  address: string;
  reception_note: string;
  partners: { name: string } | null;
}

interface PaymentEmbed {
  amount_cents: number;
  status: string;
}

interface BookingRow {
  id: string;
  confirmation_code: string;
  date: string;
  slot_time: string;
  special_requests: string;
  status: string;
  checked_in_at: string | null;
  no_show: boolean;
  created_at: string;
  lounges: LoungeEmbed | null;
  payments: PaymentEmbed[] | null;
}

const BOOKING_SELECT =
  "id, confirmation_code, date, slot_time, special_requests, status, checked_in_at, no_show, created_at, lounges(name, address, reception_note, partners(name)), payments(amount_cents, status)";

function amountPaidLabel(payments: PaymentEmbed[] | null): string {
  const succeeded = payments?.find((payment) => payment.status === "succeeded");
  if (succeeded) return `$${(succeeded.amount_cents / 100).toFixed(2)} paid`;

  const pending = payments?.find((payment) => payment.status === "pending");
  if (pending) return "Payment processing";

  return "Included in your membership";
}

async function fetchMemberDisplayName(
  supabase: SupabaseClient,
  fallbackEmail: string,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallbackEmail.split("@")[0]!;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.full_name ?? fallbackEmail.split("@")[0]!;
}

async function fromBookingRow(supabase: SupabaseClient, row: BookingRow): Promise<DigitalPass> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const memberEmail = user?.email ?? "";
  const memberName = await fetchMemberDisplayName(supabase, memberEmail);

  return {
    reference: row.confirmation_code,
    memberName,
    memberEmail,
    loungeName: row.lounges?.name ?? "",
    partnerName: row.lounges?.partners?.name ?? null,
    address: row.lounges?.address ?? "",
    receptionNote: row.lounges?.reception_note ?? "",
    dateLabel: formatFullDate(row.date),
    shortDateLabel: formatDateLabel(row.date),
    monthDayLabel: formatMonthDay(row.date),
    arrivalTime: row.slot_time,
    windowCloseTime: addMinutesToTime(row.slot_time, VISIT_WINDOW_HOURS * 60),
    stayHours: VISIT_WINDOW_HOURS,
    admission: `${ADMISSION_COUNT} member`,
    bookedOnLabel: formatMonthDay(row.created_at.slice(0, 10)),
    amountPaidLabel: amountPaidLabel(row.payments),
    specialRequests: row.special_requests,
    checkedInAt: row.checked_in_at ? formatClockTime(row.checked_in_at) : null,
    status: row.status,
    noShow: row.no_show,
  };
}

/** AC "Information available from My Bookings section" — busca por LP#, no por id. RLS ya lo limita a las reservas propias. */
export async function fetchDigitalPass(
  supabase: SupabaseClient,
  reference: string,
): Promise<DigitalPass | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("confirmation_code", reference.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return fromBookingRow(supabase, data as unknown as BookingRow);
}

/** Fixture pura para tests de componente (`digital-pass-card.test.tsx`) — no toca Supabase. */
export const AINSWORTH_PASS: DigitalPass = {
  reference: "LP-842193",
  memberName: "Alexandra Rivas",
  memberEmail: "alexandra.rivas@example.com",
  partnerName: "The Ainsworth Collection",
  loungeName: "The Ainsworth",
  address: "122 E 45th St, New York, NY 10017",
  receptionNote: "Reception on Level 2",
  dateLabel: "Saturday, September 14",
  shortDateLabel: "Sat, Sep 14",
  monthDayLabel: "September 14",
  arrivalTime: "3:30 PM",
  windowCloseTime: "7:30 PM",
  stayHours: 4,
  admission: "1 member",
  bookedOnLabel: "September 12",
  amountPaidLabel: "$81.66 paid",
  specialRequests: "Quiet desk near a window if possible, and a still water on arrival.",
  checkedInAt: "3:34 PM",
  status: "in_progress",
  noShow: false,
};

/* ------------------------------------------------------------------ */
/* My Pass — lista de reservas y su gestión (Story 5.1/5.2, extendida  */
/* por la Story 6.1 — Booking Management, sin conectar).                */
/* ------------------------------------------------------------------ */

/** "flat fee" de la Story 6.1 — tanto para cancelar tarde como para el no-show. */
export const LATE_CANCELLATION_FEE_LABEL = "$35.00";
/** Debe coincidir con el `3500` de `cancel_booking`/`reception_report_no_show` en `supabase/schemas/bookings.sql` — SQL no puede importar TS del proyecto Next.js. */
export const LATE_CANCELLATION_FEE_CENTS = 3500;
export const CANCELLATION_WINDOW_HOURS = 24;

export function isFreeCancellation(hoursUntilArrival: number): boolean {
  return hoursUntilArrival >= CANCELLATION_WINDOW_HOURS;
}

export type UpcomingBookingStatus = "in-progress" | "confirmed" | "waitlisted";

export interface UpcomingBooking {
  /** Clave estable para listas y para el cancel/cancel-fee modal. */
  id: string;
  reference: string | null;
  loungeName: string;
  /** Story 10.8 — el partner del lounge; null si no tiene. */
  partnerName: string | null;
  statusLabel: string;
  status: UpcomingBookingStatus;
  dateTimeLabel: string;
  addressLine: string | null;
  passHref: string | null;
  /**
   * Horas hasta la llegada, en la misma línea de tiempo de mockup que el
   * resto de la app (`TODAY`, no el reloj real — ver cabecera del
   * archivo). `null` cuando cancelar no aplica: "in-progress" ya hizo el
   * check-in y "waitlisted" no tiene reserva que cancelar.
   */
  hoursUntilArrival: number | null;
  freeCancellationDeadlineLabel: string | null;
  lateArrivalWindowLabel: string | null;
}

function upcomingStatusOf(row: BookingRow): UpcomingBookingStatus {
  if (row.status === "in_progress") return "in-progress";
  if (row.status === "waitlisted") return "waitlisted";
  return "confirmed";
}

function relativeDateLabel(dateIso: string): string {
  if (dateIso === today()) return "Today";
  if (dateIso === addDays(today(), 1)) return "Tomorrow";

  return formatFullDate(dateIso);
}

function fromUpcomingRow(row: BookingRow): UpcomingBooking {
  const status = upcomingStatusOf(row);
  const loungeName = row.lounges?.name ?? "";
  const partnerName = row.lounges?.partners?.name ?? null;
  const reference = row.confirmation_code;

  if (status === "in-progress") {
    return {
      id: row.id,
      reference,
      loungeName,
      partnerName,
      statusLabel: "In progress",
      status,
      dateTimeLabel: `Today · checked in at ${row.checked_in_at ? formatClockTime(row.checked_in_at) : "—"} · your window closes at ${addMinutesToTime(row.slot_time, VISIT_WINDOW_HOURS * 60)}`,
      addressLine: row.lounges?.address ?? null,
      passHref: `/my-pass/${reference}`,
      hoursUntilArrival: null,
      freeCancellationDeadlineLabel: null,
      lateArrivalWindowLabel: null,
    };
  }

  if (status === "waitlisted") {
    return {
      id: row.id,
      reference: null,
      loungeName,
      partnerName,
      statusLabel: "Waitlisted",
      status,
      dateTimeLabel: `${relativeDateLabel(row.date)} · ${row.slot_time} · no pass yet`,
      addressLine: null,
      passHref: null,
      hoursUntilArrival: null,
      freeCancellationDeadlineLabel: null,
      lateArrivalWindowLabel: null,
    };
  }

  const daysAhead = Math.round(
    (parseDate(row.date).getTime() - parseDate(today()).getTime()) / (24 * 60 * 60 * 1000),
  );
  const hoursUntilArrival = Math.max(daysAhead, 0) * 24;

  const freeCancellationDeadlineLabel = `${formatFullDate(addDays(row.date, -1))} at ${row.slot_time}`;
  const free = isFreeCancellation(hoursUntilArrival);

  return {
    id: row.id,
    reference,
    loungeName,
    partnerName,
    statusLabel: "Confirmed",
    status,
    dateTimeLabel: `${relativeDateLabel(row.date)}, ${formatFullDate(row.date)} · arrive ${row.slot_time}${free ? ` · free until ${freeCancellationDeadlineLabel}` : ""}`,
    addressLine: null,
    passHref: `/my-pass/${reference}`,
    hoursUntilArrival,
    freeCancellationDeadlineLabel,
    lateArrivalWindowLabel: free ? null : addMinutesToTime(row.slot_time, 120),
  };
}

/** AC "Information available from My Bookings section". RLS ya limita a las reservas propias. */
export async function fetchUpcomingBookings(supabase: SupabaseClient): Promise<UpcomingBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("status", ["confirmed", "in_progress", "waitlisted"])
    .order("date", { ascending: true });

  if (error) throw error;

  return (data as unknown as BookingRow[]).map(fromUpcomingRow);
}

export type PastBookingOutcome = "completed" | "no-show" | "cancelled";

export interface PastBooking {
  reference: string;
  loungeName: string;
  dateTimeLabel: string;
  outcome: PastBookingOutcome;
  explanation?: string;
}

function fromPastRow(row: BookingRow): PastBooking {
  const loungeName = row.lounges?.name ?? "";

  if (row.status === "cancelled") {
    return {
      reference: row.confirmation_code,
      loungeName,
      dateTimeLabel: `${formatFullDate(row.date)} · cancelled`,
      outcome: "cancelled",
    };
  }

  if (row.no_show) {
    return {
      reference: row.confirmation_code,
      loungeName,
      dateTimeLabel: `${formatFullDate(row.date)} · ${row.slot_time} · never checked in`,
      outcome: "no-show",
      explanation:
        "The booking window closed without a check-in. The visit still counted toward that month, and the day pass was not refunded — that is the cancellation policy you accepted at booking. Cancelling more than 24 hours ahead always avoids this.",
    };
  }

  return {
    reference: row.confirmation_code,
    loungeName,
    dateTimeLabel: `${formatFullDate(row.date)} · checked in ${row.checked_in_at ? formatClockTime(row.checked_in_at) : row.slot_time}`,
    outcome: "completed",
  };
}

/** AC "Information available from My Bookings section" (pestaña Past, Story 6.1). */
export async function fetchPastBookings(supabase: SupabaseClient): Promise<PastBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("status", ["completed", "cancelled"])
    .order("date", { ascending: false });

  if (error) throw error;

  return (data as unknown as BookingRow[]).map(fromPastRow);
}

/** Resultado de `cancel_booking` (`supabase/schemas/bookings.sql`). */
export interface CancelledBooking {
  id: string;
  status: "cancelled";
  /** `null` cuando la cancelación fue gratis (24h+ de antelación). */
  cancellationFeeCents: number | null;
}

interface CancelBookingRpcRow {
  id: string;
  status: string;
  cancellation_fee_cents: number | null;
}

/**
 * AC "Modification options: Cancel", "24-hour advance notice requirement for
 * cancellation", "No show policy enforcement - flat fee". `today` es
 * `TODAY` (`src/lib/availability.ts`), no el reloj real — mismo criterio que
 * `confirm_booking`/las RPC de recepción, para que la decisión de fee
 * servidor/cliente coincida siempre con `isFreeCancellation` de arriba.
 */
export async function cancelBooking(
  supabase: SupabaseClient,
  bookingId: string,
  today: string,
): Promise<CancelledBooking> {
  const { data, error } = await supabase
    .rpc("cancel_booking", { p_booking_id: bookingId, p_today: today })
    .single();

  if (error) throw error;

  const row = data as CancelBookingRpcRow;
  return { id: row.id, status: "cancelled", cancellationFeeCents: row.cancellation_fee_cents };
}

/** "3 of 8" — rail de la pestaña Upcoming (`Main.dc.html`). Story 9.1, sin conectar: dato de muestra. */
export const VISITS_THIS_MONTH = { used: 3, included: 8 };

/** Rail "Your record" de la pestaña Past (`History.dc.html`). Story 6.1, sin conectar: dato de muestra. */
export const BOOKING_RECORD_SUMMARY = {
  totalVisits: 14,
  completed: 11,
  cancelledInTime: 2,
  noShows: 1,
  feesCharged: LATE_CANCELLATION_FEE_LABEL,
};
