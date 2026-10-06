/**
 * Estado de disponibilidad de un lounge tal como lo muestran las cards de la
 * Fase 3. No hay datos reales: cada lounge del catálogo trae sus plazas de hoy
 * y de ahí sale la etiqueta.
 */
export interface DailyAvailability {
  openNow: boolean;
  slotsToday: number;
}

/** Por debajo de esto la card cuenta las plazas en vez de decir "Open now". */
const SCARCE_SLOTS = 3;

export function availabilityLabel({
  openNow,
  slotsToday,
}: DailyAvailability): string {
  if (slotsToday === 0) return "Fully booked today";

  if (!openNow || slotsToday <= SCARCE_SLOTS) {
    return `${slotsToday} ${slotsToday === 1 ? "slot" : "slots"} today`;
  }

  return "Open now";
}

/**
 * Story 2.2 — "Filter by availability: Calendar view".
 * Las tres franjas del drawer de filtros (`Filters.dc.html`). La Fase 4
 * añadirá la cuarta (Late 9–11) en el calendario semanal del lounge.
 */
export const TIME_BANDS = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "2–6 PM" },
  { id: "evening", label: "Evening" },
] as const;

export type TimeBand = (typeof TIME_BANDS)[number]["id"];

export function timeBandLabel(band: TimeBand): string {
  return TIME_BANDS.find((slot) => slot.id === band)!.label;
}

/**
 * El "hoy" real, como fecha ISO (`YYYY-MM-DD`) en `timeZone` — por defecto
 * el huso del dispositivo. Un lounge pasa el suyo (`lounges.timezone`) para
 * que "hoy" y "Open now" sean los de su ciudad, no los de quien mira.
 */
export function today(timeZone?: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(now);
}

/** Minutos desde medianoche en `timeZone` (por defecto, el del dispositivo). */
export function minutesNow(timeZone?: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);

  return value("hour") * 60 + value("minute");
}

/** Fecha ISO a Date en UTC, para que el día de la semana no dependa del huso. */
export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function weekdayOf(iso: string): number {
  return parseDate(iso).getUTCDay();
}

export function isPast(iso: string): boolean {
  return iso < today();
}

/** "Sun, Sep 14" — el formato de los chips de filtro activo. */
export function formatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDate(iso));
}

/** Suma días a una fecha ISO y devuelve otra fecha ISO. */
export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
