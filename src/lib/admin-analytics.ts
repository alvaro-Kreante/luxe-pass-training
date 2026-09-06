/**
 * Epic 8 — Admin & Support. Story 8.2 (Fase 2, `epic-8-admin-support/`):
 * analítica de red, popularidad, export y reportes programados.
 *
 * El período de toda la analítica es el 1–14 de septiembre (`DESIGN-SYSTEM.md`
 * §6 Fase 8): las catorce barras de `BOOKINGS_PER_DAY` suman las 1,208
 * reservas de `NETWORK_METRICS`, que se reparten en 1,102 asistidas + 62
 * no-shows + 44 cancelaciones; el rail de ingresos suma $336,250.00 brutos
 * menos $53,913.00 de atribución a partners = $282,337.00 netos; y las ocho
 * filas de `LOUNGE_POPULARITY` más `OTHER_CITIES_FOLD` suman el 100% de las
 * 1,208. Las 187 reservas de The Ainsworth y sus $8,616.50 son exactamente
 * los que muestra el Partner Dashboard del Epic 7 (`lib/partner.ts`).
 */

import { formatCurrency } from "@/lib/admin";

export { formatCurrency };

export const ANALYTICS_PERIOD_LABEL = "September 1 – 14";

export const NETWORK_METRICS = {
  bookings: 1208,
  attended: 1102,
  noShows: 62,
  cancelled: 44,
  activeMembers: 1842,
  joined: 58,
  left: 21,
  noShowRatePct: 5.1,
  noShowRatePrevPct: 5.8,
  grossRevenue: 336250,
  partnerAttribution: 53913,
  netRevenue: 282337,
};

export const BOOKINGS_PER_DAY: { label: string; count: number }[] = [
  { label: "Sun 1", count: 71 },
  { label: "Mon 2", count: 92 },
  { label: "Tue 3", count: 96 },
  { label: "Wed 4", count: 95 },
  { label: "Thu 5", count: 88 },
  { label: "Fri 6", count: 84 },
  { label: "Sat 7", count: 79 },
  { label: "Sun 8", count: 78 },
  { label: "Mon 9", count: 97 },
  { label: "Tue 10", count: 95 },
  { label: "Wed 11", count: 93 },
  { label: "Thu 12", count: 90 },
  { label: "Fri 13", count: 81 },
  { label: "Sat 14", count: 69 },
];

export const MEMBER_ACQUISITION = {
  joined: 58,
  cancelled: 21,
  netChange: 37,
  churnPct: 1.1,
  retentionPct: 87,
};

export const REVENUE_LINES: { label: string; detail: string; amount: number }[] = [
  { label: "Membership billings", detail: "129 × $2,400.00 · 58 new, 71 renewals", amount: 309600 },
  { label: "Day passes", detail: "318 × $75.00 · tax excluded", amount: 23850 },
  { label: "No-show fees", detail: "62 × $35.00", amount: 2170 },
  { label: "Late cancellation fees", detail: "18 of the 44 cancellations × $35.00", amount: 630 },
];

export const PARTNER_ATTRIBUTION_NOTE =
  "296 day passes, 806 membership visits, half of each fee";

export interface LoungePopularity {
  name: string;
  area: string;
  noShows: number;
  bookings: number;
  sharePct: number;
}

/** Las 8 de Nueva York que muestra `Popularity.dc.html` — 4 más en Miami/LA se pliegan en `OTHER_CITIES_FOLD`. */
export const LOUNGE_POPULARITY: LoungePopularity[] = [
  { name: "The Ainsworth", area: "Midtown East, New York", noShows: 9, bookings: 187, sharePct: 15.5 },
  { name: "Bergdorf Lounge", area: "Midtown, New York", noShows: 7, bookings: 164, sharePct: 13.6 },
  { name: "The Vestry", area: "Tribeca, New York", noShows: 6, bookings: 148, sharePct: 12.3 },
  { name: "Aurelia House", area: "NoMad, New York", noShows: 5, bookings: 121, sharePct: 10.0 },
  { name: "The Winslow Club", area: "Flatiron, New York", noShows: 4, bookings: 96, sharePct: 7.9 },
  { name: "Belmont Terrace", area: "Bryant Park, New York", noShows: 4, bookings: 88, sharePct: 7.3 },
  { name: "The Meridian Salon", area: "Upper East Side, New York", noShows: 3, bookings: 71, sharePct: 5.9 },
  { name: "The Gramercy Reading Room", area: "Gramercy, New York", noShows: 2, bookings: 63, sharePct: 5.2 },
];

export const OTHER_CITIES_FOLD = {
  label: "4 more lounges in Miami and Los Angeles",
  bookings: 270,
  sharePct: 22.4,
};

export const AMENITY_DEMAND: { label: string; pct: number }[] = [
  { label: "Showers", pct: 62 },
  { label: "High-speed WiFi", pct: 58 },
  { label: "Co-working", pct: 47 },
  { label: "Day rooms", pct: 31 },
  { label: "Luggage storage", pct: 24 },
  { label: "Lounge and bar", pct: 19 },
];

export const CITY_DEMAND: { city: string; lounges: number; bookings: number; sharePct: number; note?: string }[] = [
  { city: "New York", lounges: 8, bookings: 938, sharePct: 77.6 },
  { city: "Miami", lounges: 2, bookings: 152, sharePct: 12.6, note: "opened in May" },
  { city: "Los Angeles", lounges: 2, bookings: 118, sharePct: 9.8, note: "opened in July" },
];

export type ExportDataset = "bookings" | "members" | "revenue-by-partner" | "no-shows-cancellations";

export const EXPORT_DATASETS: { value: ExportDataset; label: string; note: string; rows: number }[] = [
  { value: "bookings", label: "Bookings", note: "one row per reservation", rows: NETWORK_METRICS.bookings },
  { value: "members", label: "Members", note: "anonymised by default", rows: NETWORK_METRICS.activeMembers },
  {
    value: "revenue-by-partner",
    label: "Revenue by partner",
    note: "one row per lounge and period",
    rows: LOUNGE_POPULARITY.length + 4,
  },
  {
    value: "no-shows-cancellations",
    label: "No-shows and cancellations",
    note: "with the fee charged on each",
    rows: NETWORK_METRICS.noShows + NETWORK_METRICS.cancelled,
  },
];

export interface ExportColumn {
  id: string;
  label: string;
  personal?: boolean;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { id: "reference", label: "Booking reference" },
  { id: "memberId", label: "Member ID" },
  { id: "memberName", label: "Member name", personal: true },
  { id: "lounge", label: "Lounge" },
  { id: "city", label: "City" },
  { id: "email", label: "Email address", personal: true },
  { id: "bookedDate", label: "Booked date" },
  { id: "arrivalTime", label: "Arrival time" },
  { id: "phone", label: "Phone number", personal: true },
  { id: "status", label: "Status" },
  { id: "amountCharged", label: "Amount charged" },
  { id: "paymentMethod", label: "Payment method" },
];

export const DEFAULT_SELECTED_COLUMN_IDS = EXPORT_COLUMNS.filter((c) => !c.personal).map((c) => c.id);

export const DATE_RANGE_PRESETS: { label: string; rangeLabel: string }[] = [
  { label: "Last 7 days", rangeLabel: "September 8 – September 14" },
  { label: "Last month", rangeLabel: "August 1 – August 31" },
  { label: "Quarter to date", rangeLabel: "July 1 – September 14" },
];

export type DeliveryMethod = "download" | "email" | "schedule";

export interface ScheduledReport {
  id: string;
  name: string;
  detail: string;
  cadenceLabel: string;
  format: string;
  nextRunLabel: string;
  lastRunLabel: string;
  enabled: boolean;
}

export const SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: "daily-ops-digest",
    name: "Daily operations digest",
    detail: "Bookings, arrivals and no-shows of the day · ops@ensoleil.co and 3 others",
    cadenceLabel: "Every day 7:00 AM",
    format: "CSV",
    nextRunLabel: "Tomorrow 7:00 AM",
    lastRunLabel: "sent today 7:00 AM",
    enabled: true,
  },
  {
    id: "revenue-by-partner",
    name: "Revenue by partner",
    detail: "Gross, attribution and net for each lounge · finance@ensoleil.co",
    cadenceLabel: "Mondays 6:00 AM",
    format: "CSV",
    nextRunLabel: "Sep 23, 6:00 AM",
    lastRunLabel: "sent today 6:02 AM",
    enabled: true,
  },
  {
    id: "acquisition-churn",
    name: "Member acquisition and churn",
    detail: "Joined, cancelled, retention by cohort · leadership@ensoleil.co",
    cadenceLabel: "1st of month",
    format: "CSV",
    nextRunLabel: "Oct 1, 8:00 AM",
    lastRunLabel: "sent Sep 1, 8:00 AM",
    enabled: true,
  },
  {
    id: "no-show-watchlist",
    name: "No-show watchlist",
    detail: "Members at two no-shows in twelve months · support@ensoleil.co",
    cadenceLabel: "Mondays 9:00 AM",
    format: "CSV",
    nextRunLabel: "Sep 23, 9:00 AM",
    lastRunLabel: "sent today 9:00 AM · 11 members",
    enabled: true,
  },
  {
    id: "partner-payout",
    name: "Partner payout statement",
    detail: "One statement per lounge · finance@ensoleil.co and the 12 partners",
    cadenceLabel: "1st and 16th",
    format: "PDF + CSV",
    nextRunLabel: "Oct 1, 6:15 AM",
    lastRunLabel: "sent today 6:15 AM",
    enabled: true,
  },
  {
    id: "amenity-demand",
    name: "Amenity demand",
    detail: "Which filters members search with · product@ensoleil.co",
    cadenceLabel: "Quarterly",
    format: "CSV",
    nextRunLabel: "Paused",
    lastRunLabel: "last sent Jul 1",
    enabled: false,
  },
];

export const RECENT_DELIVERIES: { reportName: string; detail: string; failed?: boolean }[] = [
  { reportName: "No-show watchlist", detail: "Today 9:00 AM · 1 recipient · 11 rows" },
  { reportName: "Daily operations digest", detail: "Today 7:00 AM · 4 recipients · 96 rows" },
  { reportName: "Partner payout statement", detail: "Today 6:15 AM · retried once, then delivered to all 13", failed: true },
  { reportName: "Revenue by partner", detail: "Today 6:02 AM · 1 recipient · 12 rows" },
];
