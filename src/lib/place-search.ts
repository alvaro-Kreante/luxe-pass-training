import type { Coordinates } from "./distance";

/**
 * Story 2.1 — ubicación elegida a mano (ManualLocation.dc.html): una
 * sugerencia de Google Places o, si Places no carga, una ciudad de
 * `lib/location.ts`. Lo único que /explore necesita es el origen y cómo
 * nombrarlo en "Sorted by distance · …".
 */
export interface Place extends Coordinates {
  label: string;
}

/**
 * Países y regiones no sirven de origen: su centroide puede caer a cientos
 * de millas de donde está el miembro, y "a 400 mi" deja de significar algo.
 */
const TOO_BROAD = new Set([
  "continent",
  "country",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "colloquial_area",
]);

export function isPreciseEnough(types: readonly string[]): boolean {
  return !types.some((type) => TOO_BROAD.has(type));
}
