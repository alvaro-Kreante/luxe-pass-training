import type { SupabaseClient } from "@supabase/supabase-js";

import { TODAY, addDays, isPast } from "./availability";
import type { AvailabilityCell, WeekBandId } from "./lounge-profile";

/**
 * Story 4.1 (Seamless Booking Flow) — conectada a Supabase real: el
 * calendario y los slots derivan de `AvailabilityCell[]` ya resueltas
 * (`fetchAvailability`, Epic 3), y el chequeo final de disponibilidad es el
 * RPC `confirm_booking`/`join_waitlist` de abajo, no un umbral simulado.
 * Story 4.2 (Payment Processing) sigue sin conectar: el cargo y los métodos
 * de pago de muestra siguen siendo deterministas, igual que
 * `registration.ts` consulta una lista fija de emails duplicados.
 */

export const ADMISSION_COUNT = 1;
export const SPECIAL_REQUEST_MAX_LENGTH = 100;
export const BOOKING_WINDOW_DAYS = 60;
export const STAY_HOURS = 4;
export const SLOT_HOLD_SECONDS = 600;

/* ------------------------------------------------------------------ */
/* Date picker mensual                                                  */
/* ------------------------------------------------------------------ */

export type DayStatus = "past" | "today" | "open" | "full" | "closed";

export interface MonthDay {
  dateIso: string;
  day: number;
  status: DayStatus;
}

export function startOfMonth(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

export function addMonths(monthIso: string, months: number): string {
  const [year, month] = monthIso.slice(0, 7).split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function daysInMonth(monthIso: string): number {
  const [year, month] = monthIso.slice(0, 7).split("-").map(Number);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Estado de un día del calendario a partir de sus celdas reales (una por
 * franja, ya resueltas por `fetchAvailability`) — "closed"/"past" a nivel de
 * celda ya factoriza cierres, días no admitidos y franjas ya pasadas; aquí
 * solo se agrega a nivel de día y se añaden los dos estados que no existen a
 * nivel de celda ("past"/"today" priman sobre lo que digan las celdas, igual
 * que hacía la versión síncrona sobre el mock).
 */
export function monthDayStatus(
  dateIso: string,
  cellsForDate: AvailabilityCell[],
): DayStatus {
  if (isPast(dateIso)) return "past";
  if (dateIso === TODAY) return "today";
  if (dateIso > addDays(TODAY, BOOKING_WINDOW_DAYS)) return "closed";
  if (cellsForDate.length === 0 || cellsForDate.every((cell) => cell.status === "closed")) {
    return "closed";
  }

  return cellsForDate.some((cell) => cell.status === "available") ? "open" : "full";
}

export function monthCalendar(monthIso: string, cells: AvailabilityCell[]): MonthDay[] {
  const start = startOfMonth(monthIso);
  const total = daysInMonth(start);

  return Array.from({ length: total }, (_, index) => {
    const dateIso = addDays(start, index);
    const cellsForDate = cells.filter((cell) => cell.dateIso === dateIso);

    return { dateIso, day: index + 1, status: monthDayStatus(dateIso, cellsForDate) };
  });
}

/* ------------------------------------------------------------------ */
/* Slots de llegada                                                     */
/* ------------------------------------------------------------------ */

export type SlotStatus = "open" | "full" | "closed" | "past";

export interface BookingSlot {
  time: string;
  band: WeekBandId;
  seatsLeft: number | null;
  status: SlotStatus;
}

/**
 * Los cinco horarios fijos de `Main.dc.html`, mapeados a las franjas de la
 * Story 2.2. Exportado (Epic 8, Story 8.1) — `admin_reschedule_booking`
 * (`supabase/schemas/support_tickets.sql`) exige un par (band, slot_time)
 * válido de este mismo dominio, así que `BookingOverrideDrawer` lo reutiliza
 * en vez de inventar horarios propios como hacía el mock
 * (`BookingOverride.dc.html` dibuja "9:00 AM"/"11:00 AM", que no existen en
 * el dominio real — desviación anotada en `docs/design/COMPONENT-MAP.md`).
 */
export const SLOT_DEFS: { time: string; band: WeekBandId }[] = [
  { time: "8:00 AM", band: "morning" },
  { time: "10:30 AM", band: "morning" },
  { time: "1:00 PM", band: "afternoon" },
  { time: "3:30 PM", band: "afternoon" },
  { time: "6:00 PM", band: "evening" },
];

/** Reparte las plazas de una franja entre sus slots sin superar el total. */
function splitSeats(total: number, parts: number, index: number): number {
  const base = Math.floor(total / parts);
  const remainder = total % parts;

  return base + (index < remainder ? 1 : 0);
}

export function slotsFor(cellsForDate: AvailabilityCell[]): BookingSlot[] {
  const cellFor = (band: WeekBandId) =>
    cellsForDate.find((cell) => cell.band === band);

  const seenPerBand = new Map<WeekBandId, number>();

  return SLOT_DEFS.map(({ time, band }) => {
    const cell = cellFor(band);

    /** Sin celda todavía (el fetch del mes no ha resuelto) — se trata como
     * cerrado hasta que llegue el dato real, en vez de fallar. */
    if (!cell) {
      return { time, band, seatsLeft: null, status: "closed" as const };
    }

    if (cell.status === "closed" || cell.status === "past") {
      return { time, band, seatsLeft: null, status: cell.status };
    }

    if (cell.status === "full") {
      return { time, band, seatsLeft: 0, status: "full" as const };
    }

    const slotsInBand = SLOT_DEFS.filter((slot) => slot.band === band).length;
    const index = seenPerBand.get(band) ?? 0;
    seenPerBand.set(band, index + 1);

    const seatsLeft = splitSeats(cell.seatsLeft!, slotsInBand, index);

    return { time, band, seatsLeft, status: seatsLeft === 0 ? "full" : "open" };
  });
}

/* ------------------------------------------------------------------ */
/* Precio — Story 4.2                                                   */
/* ------------------------------------------------------------------ */

export const DAY_PASS_PRICE = 75;
export const TAX_RATE = 0.08875;
export const MEMBERSHIP_ANNUAL_PRICE = 2400;
export const MEMBERSHIP_VISITS_INCLUDED = 8;
/** Camino por defecto: visitas agotadas, se factura como day pass (mayoría de artboards). */
export const MEMBERSHIP_VISITS_USED_DEFAULT = 8;
/** Camino `?covered=1`: la visita entra dentro de la membresía (`MembershipCovered.dc.html`). */
export const MEMBERSHIP_VISITS_USED_COVERED = 4;
/** "Renews March 3" (`MembershipCovered.dc.html`). */
export const MEMBERSHIP_RENEWAL_MONTH_DAY = "March 3";

export const CANCELLATION_POLICY = [
  "Free cancellation up to 24 hours before your arrival time.",
  "Cancelling inside 24 hours refunds 50% of the day pass price.",
  "No-shows are not refunded and are recorded in your visit history.",
];

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export interface PricingBreakdown {
  covered: boolean;
  visitsUsed: number;
  visitsIncluded: number;
  subtotal: number;
  tax: number;
  total: number;
}

export function pricingFor(covered: boolean): PricingBreakdown {
  const subtotal = covered ? 0 : DAY_PASS_PRICE;
  const tax = covered ? 0 : round2(subtotal * TAX_RATE);

  return {
    covered,
    visitsUsed: covered
      ? MEMBERSHIP_VISITS_USED_COVERED
      : MEMBERSHIP_VISITS_USED_DEFAULT,
    visitsIncluded: MEMBERSHIP_VISITS_INCLUDED,
    subtotal,
    tax,
    total: round2(subtotal + tax),
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const WHOLE_CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$2,400" — el importe anual de la membresía (`MembershipCovered.dc.html`). */
export function formatWholeCurrency(amount: number): string {
  return WHOLE_CURRENCY_FORMAT.format(amount);
}

/* ------------------------------------------------------------------ */
/* Métodos de pago de muestra                                           */
/* ------------------------------------------------------------------ */

export interface PaymentMethodSample {
  id: string;
  brand: "visa" | "mastercard";
  last4: string;
  holder: string;
  expires: string;
  isDefault?: boolean;
  /** Marca la tarjeta de muestra que demuestra `PaymentError.dc.html`. */
  simulatesDecline?: boolean;
}

export const NEW_CARD_OPTION_ID = "new-card";

export const SAMPLE_PAYMENT_METHODS: PaymentMethodSample[] = [
  {
    id: "pm_visa_4242",
    brand: "visa",
    last4: "4242",
    holder: "Alexandra Rivas",
    expires: "04/28",
    isDefault: true,
  },
  {
    id: "pm_mc_8801",
    brand: "mastercard",
    last4: "8801",
    holder: "Alexandra Rivas",
    expires: "11/27",
    simulatesDecline: true,
  },
];

export function paymentWillDecline(methodId: string | null): boolean {
  return (
    SAMPLE_PAYMENT_METHODS.find((method) => method.id === methodId)
      ?.simulatesDecline === true
  );
}

/* ------------------------------------------------------------------ */
/* Referencias de reserva                                               */
/* ------------------------------------------------------------------ */

/**
 * Hash estable y pequeño — no es criptográfico, solo determinista por
 * semilla. Posicional (`hash*31 + code`, tomando `% 900000` en cada paso
 * para no perder precisión en JS con cadenas largas) a propósito: una suma
 * simple de códigos ASCII es conmutativa — dos UUID que son anagramas entre
 * sí (o que simplemente suman igual) colisionan en el mismo LP#, un bug
 * real desde que Epic 5 usa esta referencia como clave de búsqueda (checkin
 * de recepción, pase digital), no solo como copy decorativo del recibo.
 */
function hashOf(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 900000;
  }
  return hash;
}

/**
 * "LP-######" a partir del `id` real de `bookings` (uuid devuelto por
 * `confirm_booking`/`join_waitlist`) — sustituye a la referencia derivada de
 * lounge/fecha/hora ahora que la reserva es real. **Debe coincidir** con
 * `booking_reference` en `supabase/schemas/bookings.sql` (columna generada,
 * clave real de búsqueda de la Story 5.2) y con su réplica en
 * `send-booking-receipt/index.ts` — SQL/Deno no pueden importar TS del
 * proyecto Next.js.
 */
export function bookingReferenceFromId(bookingId: string): string {
  const digits = String(100000 + hashOf(bookingId));

  return `LP-${digits}`;
}

/**
 * Solo para el camino de pago simulado (Story 4.2, sin conectar): no hay
 * reserva real todavía cuando `PaymentError.dc.html` se alcanza, así que
 * sigue derivando de lounge/fecha/hora en vez de un `bookingId`.
 */
export function errorReference(
  loungeId: string,
  dateIso: string,
  time: string,
): string {
  const digits = String(100000 + hashOf(`${loungeId}|${dateIso}|${time}`));

  return `LP-ERR-${digits}`;
}

/* ------------------------------------------------------------------ */
/* Alternativas de la waitlist                                          */
/* ------------------------------------------------------------------ */

/** "3:30 PM" + 90 → "5:00 PM" (`Waitlist.dc.html` — "Same day, 90 minutes later"). */
export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) throw new Error(`Unrecognized time format: ${time}`);

  const [, hourText, minuteText, meridiem] = match;
  let hour24 = Number(hourText) % 12;
  if (meridiem!.toUpperCase() === "PM") hour24 += 12;

  const totalMinutes = (hour24 * 60 + Number(minuteText) + minutesToAdd + 1440) % 1440;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/* ------------------------------------------------------------------ */
/* Cuenta atrás — "Slot held for M:SS"                                  */
/* ------------------------------------------------------------------ */

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Reserva real — RPC `confirm_booking` / `join_waitlist`               */
/* ------------------------------------------------------------------ */

export interface BookingRequest {
  loungeId: string;
  dateIso: string;
  band: WeekBandId;
  time: string;
  specialRequests: string;
}

export interface ConfirmedBooking {
  id: string;
  status: "confirmed" | "waitlisted";
  dateIso: string;
  band: WeekBandId;
  time: string;
  specialRequests: string;
}

interface BookingRpcRow {
  id: string;
  status: "confirmed" | "waitlisted";
  date: string;
  band: WeekBandId;
  slot_time: string;
  special_requests: string;
}

function fromRpcRow(row: BookingRpcRow): ConfirmedBooking {
  return {
    id: row.id,
    status: row.status,
    dateIso: row.date,
    band: row.band,
    time: row.slot_time,
    specialRequests: row.special_requests,
  };
}

/**
 * AC "Final availability check before one-tap confirmation". `null` cuando
 * el slot se llenó justo antes de confirmar — el llamador ofrece la
 * waitlist (`joinWaitlist`) en vez de tratarlo como un error.
 */
export async function confirmBooking(
  supabase: SupabaseClient,
  request: BookingRequest,
  /** Story 4.2 — id de `payments` ya cobrado (real o `null` si la visita está cubierta). */
  paymentId: string | null = null,
): Promise<ConfirmedBooking | null> {
  const { data, error } = await supabase
    .rpc("confirm_booking", {
      p_lounge_id: request.loungeId,
      p_date: request.dateIso,
      p_band: request.band,
      p_slot_time: request.time,
      p_special_requests: request.specialRequests,
      p_payment_id: paymentId,
    })
    .maybeSingle();

  if (error) throw error;

  return data ? fromRpcRow(data as BookingRpcRow) : null;
}

/** AC "If full, option to be on the waitlist" — solo tras elegir "Join the waitlist". */
export async function joinWaitlist(
  supabase: SupabaseClient,
  request: BookingRequest,
): Promise<ConfirmedBooking> {
  const { data, error } = await supabase
    .rpc("join_waitlist", {
      p_lounge_id: request.loungeId,
      p_date: request.dateIso,
      p_band: request.band,
      p_slot_time: request.time,
      p_special_requests: request.specialRequests,
    })
    .single();

  if (error) throw error;

  return fromRpcRow(data as BookingRpcRow);
}
