import { TODAY, addDays, isPast, weekdayOf } from "./availability";
import {
  closureCovering,
  mondayOf,
  weeklyAvailability,
  type WeekBandId,
} from "./lounge-profile";
import type { Lounge } from "./lounges";

/**
 * Story 4.1 (Seamless Booking Flow) y Story 4.2 (Payment Processing).
 * No hay backend: el chequeo final de disponibilidad, el cargo y el número
 * de reserva se simulan con datos de muestra deterministas, igual que
 * `registration.ts` consulta una lista fija de emails duplicados.
 */

export const ADMISSION_COUNT = 1;
export const SPECIAL_REQUEST_MAX_LENGTH = 100;
export const BOOKING_WINDOW_DAYS = 60;
export const STAY_HOURS = 4;
export const SLOT_HOLD_SECONDS = 600;

/**
 * Un slot con estas plazas o menos se trata como "a punto de llenarse": al
 * confirmar, el chequeo final de disponibilidad lo da por completo y ofrece
 * la waitlist. Reproduce la condición de carrera de la Story 4.1 sin backend.
 */
export const WAITLIST_THRESHOLD_SEATS = 2;

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

function isBookableBand(lounge: Lounge, dateIso: string): boolean {
  const cells = weeklyAvailability(lounge, mondayOf(dateIso)).filter(
    (cell) => cell.dateIso === dateIso,
  );
  const relevant = cells.filter(
    (cell) => cell.status !== "closed" && cell.status !== "past",
  );

  return relevant.length > 0 && !relevant.every((cell) => cell.status === "full");
}

function hasAnyOpenBand(lounge: Lounge, dateIso: string): boolean {
  const cells = weeklyAvailability(lounge, mondayOf(dateIso)).filter(
    (cell) => cell.dateIso === dateIso,
  );

  return cells.some((cell) => cell.status !== "closed" && cell.status !== "past");
}

export function monthDayStatus(lounge: Lounge, dateIso: string): DayStatus {
  if (isPast(dateIso)) return "past";
  if (dateIso === TODAY) return "today";
  if (dateIso > addDays(TODAY, BOOKING_WINDOW_DAYS)) return "closed";
  if (closureCovering(lounge, dateIso)) return "closed";
  if (lounge.closedWeekdays?.includes(weekdayOf(dateIso))) return "closed";
  if (!hasAnyOpenBand(lounge, dateIso)) return "closed";

  return isBookableBand(lounge, dateIso) ? "open" : "full";
}

export function monthCalendar(lounge: Lounge, monthIso: string): MonthDay[] {
  const start = startOfMonth(monthIso);
  const total = daysInMonth(start);

  return Array.from({ length: total }, (_, index) => {
    const dateIso = addDays(start, index);

    return { dateIso, day: index + 1, status: monthDayStatus(lounge, dateIso) };
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

/** Los cinco horarios fijos de `Main.dc.html`, mapeados a las franjas de la Story 2.2. */
const SLOT_DEFS: { time: string; band: WeekBandId }[] = [
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

export function slotsFor(lounge: Lounge, dateIso: string): BookingSlot[] {
  const cells = weeklyAvailability(lounge, mondayOf(dateIso));
  const cellFor = (band: WeekBandId) =>
    cells.find((cell) => cell.dateIso === dateIso && cell.band === band)!;

  const seenPerBand = new Map<WeekBandId, number>();

  return SLOT_DEFS.map(({ time, band }) => {
    const cell = cellFor(band);

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
/* Chequeo final de disponibilidad — waitlist                          */
/* ------------------------------------------------------------------ */

export function isAtRiskOfWaitlist(seatsLeft: number | null): boolean {
  return seatsLeft !== null && seatsLeft <= WAITLIST_THRESHOLD_SEATS;
}

/* ------------------------------------------------------------------ */
/* Referencias de reserva                                               */
/* ------------------------------------------------------------------ */

/** Hash estable y pequeño — no es criptográfico, solo determinista por semilla. */
function hashOf(seed: string): number {
  return [...seed].reduce((total, char) => total + char.charCodeAt(0) * 31, 0);
}

export function bookingReference(
  loungeId: string,
  dateIso: string,
  time: string,
): string {
  const hash = hashOf(`${loungeId}|${dateIso}|${time}`);
  const digits = String(100000 + (hash % 900000));

  return `LP-${digits}`;
}

export function errorReference(
  loungeId: string,
  dateIso: string,
  time: string,
): string {
  const digits = bookingReference(loungeId, dateIso, time).slice(3);

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
