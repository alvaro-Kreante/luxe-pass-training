import { amenityLabel, type AmenityId } from "./amenities";
import {
  addDays,
  formatDateLabel,
  timeBandLabel,
  weekdayOf,
  type TimeBand,
} from "./availability";
import { formatDistanceBand, type DistanceUnit } from "./distance";
import type { Lounge } from "./lounges";

/**
 * Story 2.2 — Lounge Filtering & Search.
 *
 * Un solo pipeline: el flow anota que mapa y lista convergen aquí, así que la
 * vista no filtra nada por su cuenta — pide resultados y los pinta.
 */

/** Las cuatro bandas del artboard `Filters.dc.html`, en millas. */
export const DISTANCE_BANDS = [0.5, 1, 2, 5] as const;

export interface Filters {
  amenities: AmenityId[];
  /** Banda elegida, en millas. `null` = sin límite. */
  maxDistanceMiles: number | null;
  /** Fecha ISO del calendario. */
  date: string | null;
  band: TimeBand | null;
  query: string;
}

export const EMPTY_FILTERS: Filters = {
  amenities: [],
  maxDistanceMiles: null,
  date: null,
  band: null,
  query: "",
};

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.amenities.length > 0 ||
    filters.maxDistanceMiles !== null ||
    filters.date !== null ||
    filters.query.trim() !== ""
  );
}

/** El buscador mira nombre, barrio, ciudad y amenities (criterio de la 2.2). */
function matchesQuery(lounge: Lounge, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (needle === "") return true;

  const haystack = [
    lounge.name,
    lounge.neighborhood,
    lounge.city,
    ...lounge.amenities.map(amenityLabel),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function isOpenOn(lounge: Lounge, date: string): boolean {
  return !(lounge.closedWeekdays ?? []).includes(weekdayOf(date));
}

export function applyFilters(lounges: Lounge[], filters: Filters): Lounge[] {
  return lounges.filter((lounge) => {
    if (!filters.amenities.every((id) => lounge.amenities.includes(id))) {
      return false;
    }

    if (
      filters.maxDistanceMiles !== null &&
      lounge.distanceMiles >= filters.maxDistanceMiles
    ) {
      return false;
    }

    if (filters.date !== null && !isOpenOn(lounge, filters.date)) return false;

    if (filters.band !== null && !lounge.bands.includes(filters.band)) {
      return false;
    }

    return matchesQuery(lounge, filters.query);
  });
}

export function countMatching(lounges: Lounge[], filters: Filters): number {
  return applyFilters(lounges, filters).length;
}

export interface FilterChip {
  id: string;
  label: string;
  /** Los filtros que quedan al quitar este chip. */
  without: Filters;
}

export function activeFilterChips(
  filters: Filters,
  unit: DistanceUnit,
): FilterChip[] {
  const chips: FilterChip[] = filters.amenities.map((id) => ({
    id: `amenity-${id}`,
    label: amenityLabel(id),
    without: {
      ...filters,
      amenities: filters.amenities.filter((other) => other !== id),
    },
  }));

  if (filters.maxDistanceMiles !== null) {
    chips.push({
      id: "distance",
      label: `Within ${formatDistanceBand(filters.maxDistanceMiles, unit)}`,
      without: { ...filters, maxDistanceMiles: null },
    });
  }

  if (filters.date !== null) {
    const band = filters.band ? ` · ${timeBandLabel(filters.band)}` : "";

    chips.push({
      id: "date",
      label: `${formatDateLabel(filters.date)}${band}`,
      without: { ...filters, date: null, band: null },
    });
  }

  return chips;
}

export interface FilterSuggestion {
  id: string;
  label: string;
  count: number;
  filters: Filters;
}

/**
 * `NoResults.dc.html` promete cuántos lounges devolvería cada cambio, así que
 * las cifras se cuentan de verdad y solo se ofrece lo que trae resultados.
 */
export function suggestionsToRecoverResults(
  lounges: Lounge[],
  filters: Filters,
): FilterSuggestion[] {
  if (countMatching(lounges, filters) > 0) return [];

  const candidates: Omit<FilterSuggestion, "count">[] = [];

  if (filters.maxDistanceMiles !== null) {
    const wider = DISTANCE_BANDS.find(
      (band) => band > filters.maxDistanceMiles!,
    );

    candidates.push(
      wider
        ? {
            id: "widen-distance",
            label: `Extend distance to < ${wider} mi`,
            filters: { ...filters, maxDistanceMiles: wider },
          }
        : {
            id: "drop-distance",
            label: "Remove the distance filter",
            filters: { ...filters, maxDistanceMiles: null },
          },
    );
  }

  const lastAmenity = filters.amenities.at(-1);
  if (lastAmenity) {
    candidates.push({
      id: `drop-${lastAmenity}`,
      label: `Drop the ${amenityLabel(lastAmenity)} filter`,
      filters: {
        ...filters,
        amenities: filters.amenities.filter((id) => id !== lastAmenity),
      },
    });
  }

  if (filters.date !== null) {
    const nextDay = addDays(filters.date, 1);
    const band = filters.band ? ` · ${timeBandLabel(filters.band)}` : "";

    candidates.push({
      id: "next-day",
      label: `Try ${formatDateLabel(nextDay)}${band}`,
      filters: { ...filters, date: nextDay },
    });
  }

  return candidates
    .map((candidate) => ({
      ...candidate,
      count: countMatching(lounges, candidate.filters),
    }))
    .filter((candidate) => candidate.count > 0);
}
