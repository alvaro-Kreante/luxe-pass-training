/**
 * Story 2.1 — "Distance display in miles/km based on user preference".
 *
 * El ajuste vive en la UI (el toggle mi/km de la topbar). Aquí solo está la
 * conversión: el catálogo guarda millas y la pantalla decide cómo mostrarlas.
 */
export type DistanceUnit = "mi" | "km";

const KM_PER_MILE = 1.60934;

/** Los artboards dan 6 min para 0.3 mi, 12 para 0.6 y 24 para 1.2: 20 min/milla. */
const MINUTES_PER_MILE = 20;

export function formatDistance(miles: number, unit: DistanceUnit): string {
  const value = unit === "km" ? miles * KM_PER_MILE : miles;

  return `${value.toFixed(1)} ${unit}`;
}

export function walkingMinutes(miles: number): number {
  return Math.max(1, Math.round(miles * MINUTES_PER_MILE));
}
