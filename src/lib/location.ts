import { LOUNGES } from "./lounges";

/**
 * Story 2.1 — entrada manual de ubicación cuando el GPS no está disponible.
 * Artboard: ManualLocation.dc.html
 */
export interface City {
  id: string;
  name: string;
  region: string;
  country: string;
}

export const CITIES: City[] = [
  { id: "new-york", name: "New York", region: "NY", country: "United States" },
  { id: "newark", name: "Newark", region: "NJ", country: "United States" },
  {
    id: "new-rochelle",
    name: "New Rochelle",
    region: "NY",
    country: "United States",
  },
  { id: "miami", name: "Miami", region: "FL", country: "United States" },
];

/** La ubicación por defecto: la del miembro de muestra. */
export const DEFAULT_CITY_ID = "new-york";

/** El artboard muestra Miami bajo "Recent". */
export const RECENT_CITY_ID = "miami";

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

export function loungeCountIn(cityId: string): number {
  return LOUNGES.filter((lounge) => lounge.cityId === cityId).length;
}
