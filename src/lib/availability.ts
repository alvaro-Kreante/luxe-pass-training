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
 * El "hoy" del mockup. Los artboards de la Fase 3 muestran septiembre de 2025
 * con los días 1–8 ya pasados, y el resto del proyecto comparte esa semana.
 */
export const TODAY = "2025-09-09";

/** Fecha ISO a Date en UTC, para que el día de la semana no dependa del huso. */
export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function weekdayOf(iso: string): number {
  return parseDate(iso).getUTCDay();
}

export function isPast(iso: string): boolean {
  return iso < TODAY;
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
