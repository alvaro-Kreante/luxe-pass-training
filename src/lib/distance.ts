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

/**
 * La banda de un filtro se escribe sin decimal vacío ("Within 2 mi"), a
 * diferencia de la distancia de un lounge, que siempre lleva uno ("0.3 mi").
 */
export function formatDistanceBand(miles: number, unit: DistanceUnit): string {
  const value = unit === "km" ? miles * KM_PER_MILE : miles;

  return `${Math.round(value * 10) / 10} ${unit}`;
}

export function walkingMinutes(miles: number): number {
  return Math.max(1, Math.round(miles * MINUTES_PER_MILE));
}

/**
 * Story 2.1 — distancia real entre el miembro y un lounge, ahora que ambos
 * tienen lat/lng reales en Supabase (antes era `distanceMiles`, un número
 * fijo del catálogo de muestra).
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}
