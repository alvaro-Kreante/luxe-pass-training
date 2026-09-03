/**
 * Story 2.2 — "Filter by amenities: WiFi, Lounge, Spa, Co-working, Day Rooms
 * (at hotels), Luggage storage". El orden es el del artboard `Filters.dc.html`.
 */
export const AMENITIES = [
  { id: "wifi", label: "WiFi" },
  { id: "lounge", label: "Lounge" },
  { id: "spa", label: "Spa" },
  { id: "co-working", label: "Co-working" },
  { id: "day-rooms", label: "Day Rooms" },
  { id: "luggage-storage", label: "Luggage storage" },
] as const;

export type AmenityId = (typeof AMENITIES)[number]["id"];

export function amenityLabel(id: AmenityId): string {
  return AMENITIES.find((amenity) => amenity.id === id)!.label;
}

/**
 * Story 3.1 — "Amenity icons with descriptions" (Main.dc.html). Una frase por
 * amenity, la misma para todos los lounges que la ofrecen: no hay un
 * catálogo de instalaciones por lounge.
 */
const AMENITY_DESCRIPTIONS: Record<AmenityId, string> = {
  wifi: "1 Gbps, private member network",
  "co-working": "Private desks and bookable meeting pods",
  lounge: "Signature cocktails and small plates",
  spa: "Treatment rooms and steam suites",
  "day-rooms": "Private rooms, bookable by the hour",
  "luggage-storage": "Attended storage, up to 8 hours per visit",
};

export function amenityDescription(id: AmenityId): string {
  return AMENITY_DESCRIPTIONS[id];
}
