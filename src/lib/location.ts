/**
 * Story 2.1 — entrada manual de ubicación cuando el GPS no está disponible.
 * Artboard: ManualLocation.dc.html
 */
export interface City {
  id: string;
  name: string;
  region: string;
  country: string;
  /** Centroide de la ciudad: origen para calcular distancia real cuando el
   * miembro elige la ciudad a mano en vez de dar su ubicación GPS. */
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  {
    id: "new-york",
    name: "New York",
    region: "NY",
    country: "United States",
    lat: 40.7595,
    lng: -73.97,
  },
  {
    id: "newark",
    name: "Newark",
    region: "NJ",
    country: "United States",
    lat: 40.7357,
    lng: -74.1724,
  },
  {
    id: "new-rochelle",
    name: "New Rochelle",
    region: "NY",
    country: "United States",
    lat: 40.9115,
    lng: -73.7824,
  },
  {
    id: "miami",
    name: "Miami",
    region: "FL",
    country: "United States",
    lat: 25.7617,
    lng: -80.1918,
  },
];

/** La ubicación por defecto: la del miembro de muestra. */
export const DEFAULT_CITY_ID = "new-york";

export function cityById(id: string): City {
  return CITIES.find((city) => city.id === id)!;
}

export function cityLabel(city: City): string {
  return `${city.name}, ${city.region}`;
}

export function searchCities(query: string): City[] {
  const needle = query.trim().toLowerCase();

  if (needle === "") return [];

  return CITIES.filter((city) => city.name.toLowerCase().includes(needle));
}

/**
 * Cuenta sobre el catálogo ya traído de Supabase (`fetchLounges`), no sobre
 * el mock — ver `lib/lounge-directory.ts`.
 */
export function loungeCountIn(
  lounges: { cityId: string }[],
  cityId: string,
): number {
  return lounges.filter((lounge) => lounge.cityId === cityId).length;
}
