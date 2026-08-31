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
