/**
 * Epic 8 — Admin & Support. Story 8.3 (Fase 2, `epic-8-admin-support/`):
 * gestión de contenido de lounges y su flujo de aprobación.
 *
 * La red son 12 lounges en 3 ciudades — 8 en Nueva York (los mismos de las
 * Fases 3 y 4), 2 en Miami y 2 en Los Ángeles, más un draft en Brooklyn
 * (`DESIGN-SYSTEM.md` §6 Fase 8). The Vestry es el único lounge con cambios
 * pendientes de aprobación, tal como lo fija `LoungeEdit.dc.html`/`Approval.dc.html`.
 */

export type LoungeContentStatus = "live" | "draft" | "pending-approval";

export interface AdminLoungeRow {
  id: string;
  name: string;
  area: string;
  capacity: number;
  status: LoungeContentStatus;
  pendingCount?: number;
  photosApproved: number;
  photosTotal: number;
  amenitiesApproved: number;
  amenitiesTotal: number;
  updatedLabel: string;
  editedNote?: string;
}

export const ADMIN_LOUNGES: AdminLoungeRow[] = [
  {
    id: "the-ainsworth",
    name: "The Ainsworth",
    area: "Midtown East, New York",
    capacity: 32,
    status: "live",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 6,
    amenitiesTotal: 6,
    updatedLabel: "Sep 12",
  },
  {
    id: "bergdorf-lounge",
    name: "Bergdorf Lounge",
    area: "Midtown, New York",
    capacity: 28,
    status: "live",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 5,
    amenitiesTotal: 6,
    updatedLabel: "Sep 9",
  },
  {
    id: "the-vestry",
    name: "The Vestry",
    area: "Tribeca, New York",
    capacity: 24,
    status: "pending-approval",
    pendingCount: 3,
    editedNote: "edited by Theo B. this morning",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 6,
    amenitiesTotal: 6,
    updatedLabel: "9:52 AM",
  },
  {
    id: "aurelia-house",
    name: "Aurelia House",
    area: "NoMad, New York",
    capacity: 20,
    status: "live",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 4,
    amenitiesTotal: 6,
    updatedLabel: "Aug 30",
  },
  {
    id: "the-winslow-club",
    name: "The Winslow Club",
    area: "Flatiron, New York",
    capacity: 18,
    status: "live",
    photosApproved: 2,
    photosTotal: 3,
    amenitiesApproved: 4,
    amenitiesTotal: 6,
    updatedLabel: "Aug 22",
  },
  {
    id: "belmont-terrace",
    name: "Belmont Terrace",
    area: "Bryant Park, New York",
    capacity: 22,
    status: "live",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 5,
    amenitiesTotal: 6,
    updatedLabel: "Aug 18",
  },
  {
    id: "the-meridian-salon",
    name: "The Meridian Salon",
    area: "Upper East Side, New York",
    capacity: 16,
    status: "live",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 4,
    amenitiesTotal: 6,
    updatedLabel: "Aug 11",
  },
  {
    id: "the-gramercy-reading-room",
    name: "The Gramercy Reading Room",
    area: "Gramercy, New York",
    capacity: 14,
    status: "live",
    photosApproved: 3,
    photosTotal: 3,
    amenitiesApproved: 3,
    amenitiesTotal: 6,
    updatedLabel: "Aug 4",
  },
  {
    id: "the-calloway",
    name: "The Calloway",
    area: "Williamsburg, Brooklyn",
    capacity: 0,
    status: "draft",
    editedNote: "opening in October · never published",
    photosApproved: 1,
    photosTotal: 3,
    amenitiesApproved: 3,
    amenitiesTotal: 6,
    updatedLabel: "Sep 15",
  },
];

export const OTHER_CITIES_LOUNGES_FOLD = "4 more lounges · Miami and Los Angeles · all live";

export function getAdminLounge(id: string): AdminLoungeRow | undefined {
  return ADMIN_LOUNGES.find((lounge) => lounge.id === id);
}

export interface PendingChange {
  id: string;
  title: string;
  fromLabel: string;
  toLabel: string;
  note?: string;
}

/** Solo The Vestry trae los 3 cambios literales de `LoungeEdit.dc.html`/`Approval.dc.html`. */
export const VESTRY_PENDING_CHANGES: PendingChange[] = [
  { id: "amenity-showers", title: "Amenity added", fromLabel: "5 amenities", toLabel: "Showers" },
  {
    id: "friday-hours",
    title: "Friday hours extended",
    fromLabel: "8 AM – 9 PM",
    toLabel: "8 AM – 11 PM",
    note: "Adds a Late slot of 10 seats on Fridays",
  },
  { id: "photo-shower-suite", title: "Photo added", fromLabel: "2 photos", toLabel: "Shower suite" },
];

/**
 * Las mismas 3 entradas de `VESTRY_PENDING_CHANGES`, vistas desde la cola de
 * `Approval.dc.html`: título y detalle propios de esa pantalla, no los del
 * diff de `LoungeEdit.dc.html` — el mismo cambio se describe distinto según
 * si se mira desde el editor o desde la cola.
 */
export const VESTRY_QUEUE_ITEMS = [
  { id: "amenity-showers", title: "Showers added", detail: "The Vestry · amenity list · 9:52 AM" },
  { id: "friday-hours", title: "Friday hours to 11 PM", detail: "The Vestry · opening hours · 9:52 AM" },
  { id: "photo-shower-suite", title: "Shower suite photo", detail: "The Vestry · gallery · 9:52 AM" },
];

export const VESTRY_SUBMITTED_BY = "Theo Baptiste";
export const VESTRY_SUBMITTED_TIME_LABEL = "9:52 AM";

export const VESTRY_PHOTOS = [
  { label: "Main room", state: "live" as const },
  { label: "Day room", state: "live" as const },
  { label: "Shower suite · 3024 × 2016", state: "new-waiting" as const },
];

export const VESTRY_AMENITIES = [
  { label: "High-speed WiFi", state: "live" as const },
  { label: "Co-working", state: "live" as const },
  { label: "Lounge and bar", state: "live" as const },
  { label: "Showers", state: "being-added" as const },
  { label: "Luggage storage", state: "live" as const },
  { label: "Day rooms", state: "live" as const },
];

export const VESTRY_HOURS = [
  { day: "Mon", label: "8 AM – 9 PM" },
  { day: "Tue", label: "8 AM – 9 PM" },
  { day: "Wed", label: "8 AM – 9 PM" },
  { day: "Thu", label: "8 AM – 9 PM" },
  { day: "Fri", label: "8 AM – 11 PM", highlighted: true },
  { day: "Sat", label: "9 AM – 10 PM" },
  { day: "Sun", label: "Closed", closed: true },
];

export const VESTRY_AVAILABILITY = [
  { label: "Morning · 8–12", seats: 12 },
  { label: "Afternoon · 12–5", seats: 24 },
  { label: "Evening · 5–9", seats: 18 },
  { label: "Late · 9–11 · Fridays", seats: 10, highlighted: true },
];

export const VESTRY_RESTRICTIONS = [
  "Two hours' notice to book",
  "Annual members and day passes",
  "Admission for one · no guests",
];

export const VESTRY_SEASONAL_CLOSURE = "Closed Nov 27–28 · Thanksgiving";

export const VESTRY_LAST_PUBLISHED_NOTE = "September 3 · address corrected by Priya R.";

export const VESTRY_APPROVAL_COMPARISON = {
  live: {
    amenities: ["WiFi", "Co-working", "Bar", "Luggage", "Day rooms"],
    fridayHoursLabel: "8 AM – 9 PM",
    photoCount: 2,
    statusLabel: "Open until 9 PM",
  },
  proposed: {
    amenities: ["WiFi", "Co-working", "Bar", "Showers", "Luggage", "Day rooms"],
    fridayHoursLabel: "8 AM – 11 PM",
    photoCount: 3,
    statusLabel: "Open until 11 PM",
  },
};

export const VESTRY_APPROVAL_IMPACT = [
  { label: "Appears in", value: "62% of searches", note: "the Showers filter" },
  { label: "Opens", value: "10 more seats", note: "Fridays, 9–11 PM" },
  { label: "Reaches members", value: "Immediately", note: "no notification is sent" },
];
