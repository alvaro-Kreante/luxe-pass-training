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
