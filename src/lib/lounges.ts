import type { AmenityId } from "./amenities";
import type { TimeBand } from "./availability";

/**
 * Catálogo de muestra de lounges. Los siete de Nueva York que se ven en los
 * artboards de la Fase 3 (`Main`, `ListView`) van con sus datos literales; el
 * resto completa las cifras que esos mismos artboards anuncian — doce lounges
 * en Nueva York, tres en Newark, uno en New Rochelle.
 *
 * No hay backend: esta lista es todo lo que existe.
 */
export interface Lounge {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  cityId: string;
  rating: number;
  /** El catálogo guarda millas; la pantalla decide si las muestra en mi o km. */
  distanceMiles: number;
  amenities: AmenityId[];
  openNow: boolean;
  slotsToday: number;
  /** Horario de hoy, tal como lo escribe `ListView.dc.html`. */
  hours: string;
  /** Franjas que el lounge admite (Filters.dc.html). */
  bands: TimeBand[];
  /** Días de la semana que no admite reservas (0 = domingo). */
  closedWeekdays?: number[];
  /** Posición en el mapa dibujado, en coordenadas del viewBox 820×760. */
  map?: { x: number; y: number };
  /** Destacado en el Home del área de miembro. */
  featured?: boolean;
}

export const LOUNGES: Lounge[] = [
  {
    id: "the-ainsworth",
    name: "The Ainsworth",
    neighborhood: "Midtown East",
    city: "New York",
    cityId: "new-york",
    rating: 4.9,
    distanceMiles: 0.3,
    amenities: ["wifi", "co-working", "lounge", "luggage-storage"],
    openNow: true,
    slotsToday: 8,
    hours: "Open until 11 PM",
    bands: ["morning", "afternoon", "evening"],
    closedWeekdays: [0],
    map: { x: 375, y: 375 },
    featured: true,
  },
  {
    id: "belmont-terrace",
    name: "Belmont Terrace",
    neighborhood: "Bryant Park",
    city: "New York",
    cityId: "new-york",
    rating: 4.8,
    distanceMiles: 0.6,
    amenities: ["wifi", "co-working", "luggage-storage"],
    openNow: true,
    slotsToday: 6,
    hours: "Open until 10 PM",
    bands: ["morning", "afternoon", "evening"],
    closedWeekdays: [0],
    map: { x: 158, y: 208 },
    featured: true,
  },
  {
    id: "aurelia-house",
    name: "Aurelia House",
    neighborhood: "NoMad",
    city: "New York",
    cityId: "new-york",
    rating: 4.7,
    distanceMiles: 0.9,
    amenities: ["wifi", "co-working", "spa", "day-rooms"],
    openNow: false,
    slotsToday: 3,
    hours: "Opens 8 AM",
    bands: ["morning", "afternoon"],
    closedWeekdays: [0],
    map: { x: 574, y: 168 },
  },
  {
    id: "the-winslow-club",
    name: "The Winslow Club",
    neighborhood: "Flatiron",
    city: "New York",
    cityId: "new-york",
    rating: 4.6,
    distanceMiles: 1.2,
    amenities: ["wifi", "co-working", "day-rooms"],
    openNow: true,
    slotsToday: 5,
    hours: "Open until 9 PM",
    bands: ["morning", "afternoon", "evening"],
    closedWeekdays: [0],
    map: { x: 724, y: 232 },
  },
  {
    id: "celeste-rooftop",
    name: "Céleste Rooftop",
    neighborhood: "Chelsea",
    city: "New York",
    cityId: "new-york",
    rating: 4.8,
    distanceMiles: 1.6,
    amenities: ["wifi", "lounge", "spa"],
    openNow: true,
    slotsToday: 0,
    hours: "Open until 1 AM",
    bands: ["afternoon", "evening"],
    map: { x: 242, y: 498 },
  },
  {
    id: "halcyon-reading-room",
    name: "Halcyon Reading Room",
    neighborhood: "Gramercy",
    city: "New York",
    cityId: "new-york",
    rating: 4.5,
    distanceMiles: 2.1,
    amenities: ["wifi", "lounge"],
    openNow: true,
    slotsToday: 7,
    hours: "Open until 8 PM",
    bands: ["morning", "afternoon"],
    closedWeekdays: [1],
    map: { x: 610, y: 546 },
  },
  {
    id: "the-meridian-salon",
    name: "The Meridian Salon",
    neighborhood: "SoHo",
    city: "New York",
    cityId: "new-york",
    rating: 4.6,
    distanceMiles: 2.8,
    amenities: ["wifi", "lounge", "spa", "luggage-storage"],
    openNow: true,
    slotsToday: 4,
    hours: "Open until 10 PM",
    bands: ["afternoon", "evening"],
    map: { x: 770, y: 608 },
  },
  {
    id: "rue-lafayette-club",
    name: "Rue Lafayette Club",
    neighborhood: "West Village",
    city: "New York",
    cityId: "new-york",
    rating: 4.7,
    distanceMiles: 3.3,
    amenities: ["wifi", "co-working", "lounge"],
    openNow: true,
    slotsToday: 9,
    hours: "Open until 11 PM",
    bands: ["morning", "afternoon", "evening"],
    map: { x: 450, y: 662 },
  },
  {
    id: "the-cordelia",
    name: "The Cordelia",
    neighborhood: "Upper East Side",
    city: "New York",
    cityId: "new-york",
    rating: 4.9,
    distanceMiles: 3.7,
    amenities: ["wifi", "spa", "day-rooms", "luggage-storage"],
    openNow: true,
    slotsToday: 2,
    hours: "Open until 9 PM",
    bands: ["morning", "evening"],
    closedWeekdays: [2],
    map: { x: 300, y: 120 },
  },
  {
    id: "sable-and-stone",
    name: "Sable & Stone",
    neighborhood: "Tribeca",
    city: "New York",
    cityId: "new-york",
    rating: 4.4,
    distanceMiles: 4.1,
    amenities: ["wifi", "co-working", "luggage-storage"],
    openNow: false,
    slotsToday: 6,
    hours: "Opens 9 AM",
    bands: ["morning", "afternoon"],
    map: { x: 100, y: 560 },
  },
  {
    id: "the-ellery-room",
    name: "The Ellery Room",
    neighborhood: "Murray Hill",
    city: "New York",
    cityId: "new-york",
    rating: 4.5,
    distanceMiles: 4.5,
    amenities: ["wifi", "lounge", "day-rooms"],
    openNow: true,
    slotsToday: 0,
    hours: "Open until 10 PM",
    bands: ["afternoon", "evening"],
    closedWeekdays: [1],
    map: { x: 660, y: 430 },
  },
  {
    id: "verandah-no-9",
    name: "Verandah No. 9",
    neighborhood: "Hudson Yards",
    city: "New York",
    cityId: "new-york",
    rating: 4.6,
    distanceMiles: 4.9,
    amenities: ["wifi", "co-working", "spa", "lounge"],
    openNow: true,
    slotsToday: 5,
    hours: "Open until 11 PM",
    bands: ["morning", "afternoon", "evening"],
    map: { x: 330, y: 250 },
  },
  {
    id: "the-ironbound-salon",
    name: "The Ironbound Salon",
    neighborhood: "Ironbound",
    city: "Newark",
    cityId: "newark",
    rating: 4.3,
    distanceMiles: 9.4,
    amenities: ["wifi", "lounge"],
    openNow: true,
    slotsToday: 6,
    hours: "Open until 9 PM",
    bands: ["morning", "afternoon", "evening"],
  },
  {
    id: "passaic-house",
    name: "Passaic House",
    neighborhood: "Downtown",
    city: "Newark",
    cityId: "newark",
    rating: 4.2,
    distanceMiles: 10.1,
    amenities: ["wifi", "co-working", "luggage-storage"],
    openNow: true,
    slotsToday: 4,
    hours: "Open until 8 PM",
    bands: ["morning", "afternoon"],
    closedWeekdays: [0],
  },
  {
    id: "aurora-gate-lounge",
    name: "Aurora Gate Lounge",
    neighborhood: "Terminal B",
    city: "Newark",
    cityId: "newark",
    rating: 4.5,
    distanceMiles: 12.6,
    amenities: ["wifi", "lounge", "spa", "day-rooms", "luggage-storage"],
    openNow: true,
    slotsToday: 11,
    hours: "Open until 1 AM",
    bands: ["morning", "afternoon", "evening"],
  },
  {
    id: "the-pelham-room",
    name: "The Pelham Room",
    neighborhood: "Downtown",
    city: "New Rochelle",
    cityId: "new-rochelle",
    rating: 4.4,
    distanceMiles: 16.2,
    amenities: ["wifi", "lounge", "day-rooms"],
    openNow: false,
    slotsToday: 5,
    hours: "Opens 10 AM",
    bands: ["morning", "afternoon"],
    closedWeekdays: [0, 1],
  },
  {
    id: "marbella-sky-lounge",
    name: "Marbella Sky Lounge",
    neighborhood: "Brickell",
    city: "Miami",
    cityId: "miami",
    rating: 4.7,
    distanceMiles: 1.1,
    amenities: ["wifi", "lounge", "spa", "day-rooms"],
    openNow: true,
    slotsToday: 7,
    hours: "Open until 12 AM",
    bands: ["afternoon", "evening"],
    featured: true,
  },
];

export function featuredLounges(): Lounge[] {
  return LOUNGES.filter((lounge) => lounge.featured);
}

/** Los lounges de una ciudad, del más cercano al más lejano. */
export function loungesIn(cityId: string): Lounge[] {
  return LOUNGES.filter((lounge) => lounge.cityId === cityId).sort(
    (a, b) => a.distanceMiles - b.distanceMiles,
  );
}
