/**
 * Epic 7 — Partner Dashboard. Datos de muestra del turno de The Ainsworth el
 * sábado 14 de septiembre, continuación de la línea temporal del Epic 5/6:
 * el check-in de Alexandra Rivas a las 3:34 PM ya ocurría en la consola de
 * recepción (`lib/passes.ts`). Sin backend: la actualización en vivo de
 * Naomi Feldstein (Story 7.1) es una simulación determinista con temporizador,
 * no datos aleatorios — igual que el chequeo de disponibilidad del Epic 4.
 *
 * Las cifras cuadran entre sí (ver DESIGN-SYSTEM.md §6 Fase 2): 14 esperados
 * al abrir la pantalla = 10 llegados (8 con nombre + 2 plegados) + 3
 * pendientes + 1 no-show; tras la reserva de Naomi, 15 esperados = 10 + 4
 * pendientes + 1 no-show.
 */

export const PARTNER_VENUE = {
  name: "The Ainsworth",
  staffName: "Dana O.",
  staffRole: "Front of house",
  dateLabel: "Saturday, September 14",
  initial: "A",
};

export const PARTNER_ACCOUNT = {
  email: "dana.okafor@theainsworth.com",
  password: "AinsworthFOH!24",
};

export function partnerCredentialsMatch(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === PARTNER_ACCOUNT.email.toLowerCase() &&
    password === PARTNER_ACCOUNT.password
  );
}

/** Ventana de admisión de la Fase 2: 4 horas desde la hora reservada. */
export const ADMISSION_WINDOW_HOURS = 4;

export type PartnerGuestStatus = "arrived" | "pending" | "no-show" | "new-booking" | "cancelled";

export interface PartnerGuest {
  /** También el número LP de la reserva. */
  id: string;
  name: string;
  initials: string;
  membershipLabel: string;
  visitLabel: string;
  arrivalTime: string;
  status: PartnerGuestStatus;
  email: string;
  phone: string;
  /** "Until 8:30 PM" — ventana de admisión desde la hora reservada. */
  admissionWindowLabel: string;
  admissionLabel: string;
  bookedAgoLabel: string;
  specialRequests: string;
  emergencyContact?: string;
  /** Story 7.1 — el motivo elegido al reportar el no-show (`NoShow.dc.html`). */
  noShowReason?: NoShowReason;
}

/**
 * Los 14 invitados con nombre del turno. `Main.dc.html` pliega a Marcus
 * Ellery y Priya Raghunathan (las llegadas de las 9:00 AM) en una fila "2
 * earlier arrivals" sin nombre — `EmailDigest.dc.html` sí los nombra, así que
 * aquí quedan como invitados completos: la lista no pliega ninguna fila, para
 * que "guest list display: name, contact, email" (Story 7.1) se compruebe
 * sobre cualquiera de los 14, no solo sobre los que el artboard deja
 * expandidos en un instante concreto.
 */
export const PARTNER_GUESTS: PartnerGuest[] = [
  {
    id: "LP-839014",
    name: "Marcus Ellery",
    initials: "ME",
    membershipLabel: "Annual member",
    visitLabel: "6th visit here",
    arrivalTime: "9:00 AM",
    status: "arrived",
    email: "marcus.ellery@example.com",
    phone: "+1 (555) 209-4471",
    admissionWindowLabel: "Until 1:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 4 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-839221",
    name: "Priya Raghunathan",
    initials: "PR",
    membershipLabel: "Annual member",
    visitLabel: "2nd visit here",
    arrivalTime: "9:00 AM",
    status: "arrived",
    email: "priya.raghunathan@example.com",
    phone: "+1 (555) 663-2085",
    admissionWindowLabel: "Until 1:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 2 days ago",
    specialRequests: "Quiet desk requested.",
  },
  {
    id: "LP-840107",
    name: "Theo Lindqvist",
    initials: "TL",
    membershipLabel: "Annual member",
    visitLabel: "3rd visit here",
    arrivalTime: "10:00 AM",
    status: "arrived",
    email: "theo.lindqvist@example.com",
    phone: "+1 (555) 214-9930",
    admissionWindowLabel: "Until 2:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 3 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-840388",
    name: "Camille Duforest",
    initials: "CD",
    membershipLabel: "Annual member",
    visitLabel: "1st visit here",
    arrivalTime: "10:30 AM",
    status: "no-show",
    email: "camille.duforest@example.com",
    phone: "+1 (555) 668-4172",
    admissionWindowLabel: "Window closed 2:30 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 5 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-840512",
    name: "Jonah Whitfield",
    initials: "JW",
    membershipLabel: "Annual member",
    visitLabel: "7th visit here",
    arrivalTime: "11:00 AM",
    status: "arrived",
    email: "jonah.whitfield@example.com",
    phone: "+1 (555) 903-2261",
    admissionWindowLabel: "Until 3:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 6 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-841003",
    name: "Elena Vasquez",
    initials: "EV",
    membershipLabel: "Day pass",
    visitLabel: "1st visit here",
    arrivalTime: "12:00 PM",
    status: "arrived",
    email: "elena.vasquez@example.com",
    phone: "+1 (555) 447-8815",
    admissionWindowLabel: "Until 4:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 1 day ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-841166",
    name: "Rowan Achebe",
    initials: "RA",
    membershipLabel: "Annual member",
    visitLabel: "5th visit here",
    arrivalTime: "12:30 PM",
    status: "arrived",
    email: "rowan.achebe@example.com",
    phone: "+1 (555) 730-5504",
    admissionWindowLabel: "Until 4:30 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 4 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-841420",
    name: "Sofia Marchetti",
    initials: "SM",
    membershipLabel: "Annual member",
    visitLabel: "2nd visit here",
    arrivalTime: "1:30 PM",
    status: "arrived",
    email: "sofia.marchetti@example.com",
    phone: "+1 (555) 291-6640",
    admissionWindowLabel: "Until 5:30 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 2 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-841733",
    name: "Daniel Kwon",
    initials: "DK",
    membershipLabel: "Day pass",
    visitLabel: "1st visit here",
    arrivalTime: "2:00 PM",
    status: "arrived",
    email: "daniel.kwon@example.com",
    phone: "+1 (555) 512-0087",
    admissionWindowLabel: "Until 6:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 1 day ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-842051",
    name: "Beatrice Nolan",
    initials: "BN",
    membershipLabel: "Annual member",
    visitLabel: "9th visit here",
    arrivalTime: "3:00 PM",
    status: "arrived",
    email: "beatrice.nolan@example.com",
    phone: "+1 (555) 386-7749",
    admissionWindowLabel: "Until 7:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 3 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-842193",
    name: "Alexandra Rivas",
    initials: "AR",
    membershipLabel: "Annual member",
    visitLabel: "12th visit here",
    arrivalTime: "3:30 PM",
    status: "arrived",
    email: "alexandra.rivas@example.com",
    phone: "+1 (555) 118-2043",
    admissionWindowLabel: "Until 7:30 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 2 days ago",
    specialRequests: "Quiet desk near a window if possible, and a still water on arrival.",
  },
  {
    id: "LP-842407",
    name: "Idris Fontaine",
    initials: "IF",
    membershipLabel: "Annual member",
    visitLabel: "4th visit here",
    arrivalTime: "4:30 PM",
    status: "pending",
    email: "idris.fontaine@example.com",
    phone: "+1 (555) 604-3318",
    admissionWindowLabel: "Until 8:30 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 2 days ago",
    specialRequests:
      "Arriving straight from the airport — somewhere to leave a cabin bag if there is room.",
    emergencyContact: "Noor Fontaine · partner · +1 (555) 604-3319",
  },
  {
    id: "LP-842612",
    name: "Harriet Osei",
    initials: "HO",
    membershipLabel: "Annual member",
    visitLabel: "1st visit here",
    arrivalTime: "5:00 PM",
    status: "pending",
    email: "harriet.osei@example.com",
    phone: "+1 (555) 877-2290",
    admissionWindowLabel: "Until 9:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 6 days ago",
    specialRequests: "No special requests noted.",
  },
  {
    id: "LP-842840",
    name: "Lucas Bergström",
    initials: "LB",
    membershipLabel: "Day pass",
    visitLabel: "1st visit here",
    arrivalTime: "6:00 PM",
    status: "pending",
    email: "lucas.bergstrom@example.com",
    phone: "+1 (555) 340-9971",
    admissionWindowLabel: "Until 10:00 PM",
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: "Booked 1 day ago",
    specialRequests: "No special requests noted.",
  },
];

/** La reserva que llega en vivo (Story 7.1 "real-time updates" / 7.2 email). */
export const LIVE_BOOKING: PartnerGuest = {
  id: "LP-842905",
  name: "Naomi Feldstein",
  initials: "NF",
  membershipLabel: "Annual member",
  visitLabel: "1st visit here",
  arrivalTime: "7:00 PM",
  status: "new-booking",
  email: "naomi.feldstein@example.com",
  phone: "+1 (555) 771-3326",
  admissionWindowLabel: "Until 11:00 PM",
  admissionLabel: "1 member · no guests",
  bookedAgoLabel: "Booked just now",
  specialRequests: "No special requests noted.",
};

export const LIVE_BOOKING_TIME_LABEL = "3:41 PM";

/**
 * Story 7.2 — "cancellation notifications with updated guest count" y
 * "waitlist promotion alerts". Harriet Osei (pendiente en el catálogo base)
 * cancela a las 3:52 PM; Victor Almeida, en espera desde las 11:20 AM, ocupa
 * su hueco a las 3:54 PM — automático, sin que el partner intervenga.
 */
export const CANCELLED_GUEST_ID = "LP-842612";
export const CANCELLATION_TIME_LABEL = "3:52 PM";
export const WAITLIST_PROMOTION_TIME_LABEL = "3:54 PM";

export const WAITLIST_PROMOTED_GUEST: PartnerGuest = {
  id: "LP-842911",
  name: "Victor Almeida",
  initials: "VA",
  membershipLabel: "Day pass",
  visitLabel: "1st visit here",
  arrivalTime: "5:00 PM",
  status: "pending",
  email: "victor.almeida@example.com",
  phone: "+1 (555) 640-2217",
  admissionWindowLabel: "Until 9:00 PM",
  admissionLabel: "1 member · no guests",
  bookedAgoLabel: "Waiting since 11:20 AM · promoted from the waitlist",
  specialRequests: "No special requests noted.",
};

export function guestCounts(guests: PartnerGuest[]) {
  const arrived = guests.filter((g) => g.status === "arrived").length;
  const pending = guests.filter((g) => g.status === "pending" || g.status === "new-booking").length;
  const noShow = guests.filter((g) => g.status === "no-show").length;

  return {
    expected: arrived + pending + noShow,
    arrived,
    pending,
    noShow,
  };
}

export function findPartnerGuest(guests: PartnerGuest[], id: string): PartnerGuest | undefined {
  return guests.find((guest) => guest.id === id);
}

/** Story 7.1 — "search/filter guests by name or date": coincide por nombre o LP#. */
export function matchesGuestQuery(guest: PartnerGuest, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return (
    guest.name.toLowerCase().includes(normalized) ||
    guest.id.toLowerCase().includes(normalized)
  );
}

/** `NoShow.dc.html` "What happened?" — tres motivos, el primero preseleccionado. */
export const NO_SHOW_REASONS = [
  {
    value: "never-arrived",
    label: "Never arrived",
    description: "The guest did not come to the lounge at all.",
  },
  {
    value: "arrived-after-window",
    label: "Arrived after the window closed",
    description:
      "They turned up, but past the admission window — record it and let us handle the fee.",
  },
  {
    value: "something-else",
    label: "Something else",
    description: "Add a note and En Soleil support will review it before anything is charged.",
  },
] as const;

export type NoShowReason = (typeof NO_SHOW_REASONS)[number]["value"];

/** Story 7.1 — reporta el no-show del invitado `id`, sin mutar el array de entrada. */
export function reportNoShow(
  guests: PartnerGuest[],
  id: string,
  reason: NoShowReason,
): PartnerGuest[] {
  return guests.map((guest) =>
    guest.id === id ? { ...guest, status: "no-show", noShowReason: reason } : guest,
  );
}

/** Story 7.1 — marca la llegada del invitado `id` (el gesto de la casilla de asistencia). */
export function markArrived(guests: PartnerGuest[], id: string): PartnerGuest[] {
  return guests.map((guest) => (guest.id === id ? { ...guest, status: "arrived" } : guest));
}

/** Story 7.1 — "real-time updates when new bookings are made": añade la reserva en vivo. */
export function applyLiveBooking(guests: PartnerGuest[]): PartnerGuest[] {
  return [...guests, LIVE_BOOKING];
}

/**
 * Story 7.2 — cancela `CANCELLED_GUEST_ID` y, en el mismo instante, promociona
 * automáticamente al siguiente de la waitlist. El recuento neto no cambia
 * (una plaza cancelada, otra ocupada), tal como cuenta `EmailCancellation.dc.html`.
 */
export function applyCancellationAndPromotion(guests: PartnerGuest[]): PartnerGuest[] {
  const withCancellation = guests.map((guest) =>
    guest.id === CANCELLED_GUEST_ID ? { ...guest, status: "cancelled" as const } : guest,
  );
  return [...withCancellation, WAITLIST_PROMOTED_GUEST];
}

export interface PartnerActivityItem {
  id: string;
  kind: "new-booking" | "checked-in" | "no-show" | "cancellation" | "waitlist-promotion";
  title: string;
  time: string;
  body: string;
  read: boolean;
  /** Story 7.2 — enlace al email correspondiente ("View email"). */
  emailHref?: string;
}

export const PARTNER_ACTIVITY: PartnerActivityItem[] = [
  {
    id: "activity-checkin-alexandra",
    kind: "checked-in",
    title: "Checked in",
    time: "3:34 PM",
    body: "Alexandra Rivas · 3:30 PM arrival · scanned at reception.",
    read: false,
  },
  {
    id: "activity-checkin-beatrice",
    kind: "checked-in",
    title: "Checked in",
    time: "3:07 PM",
    body: "Beatrice Nolan · 3:00 PM arrival.",
    read: false,
  },
  {
    id: "activity-no-show-camille",
    kind: "no-show",
    title: "No-show recorded",
    time: "2:31 PM",
    body: "Camille Duforest · 10:30 AM arrival · window closed at 2:30 PM.",
    read: true,
  },
];

export const LIVE_BOOKING_ACTIVITY: PartnerActivityItem = {
  id: "activity-new-booking-naomi",
  kind: "new-booking",
  title: "New booking",
  time: LIVE_BOOKING_TIME_LABEL,
  body: "Naomi Feldstein booked 7:00 PM tonight · LP-842905. Today's count is now 15.",
  read: false,
  emailHref: "/partner/emails/new-booking",
};

export const CANCELLATION_ACTIVITY: PartnerActivityItem = {
  id: "activity-cancellation-harriet",
  kind: "cancellation",
  title: "Cancellation",
  time: CANCELLATION_TIME_LABEL,
  body: "Harriet Osei cancelled her 5:00 PM visit · LP-842612. Today's count is now 14.",
  read: false,
  emailHref: "/partner/emails/cancellation",
};

export const WAITLIST_PROMOTION_ACTIVITY: PartnerActivityItem = {
  id: "activity-waitlist-promotion-victor",
  kind: "waitlist-promotion",
  title: "Waitlist promotion",
  time: WAITLIST_PROMOTION_TIME_LABEL,
  body: "Victor Almeida was promoted from the waitlist to fill the 5:00 PM slot. Today's count is back to 15.",
  read: false,
  emailHref: "/partner/emails/cancellation",
};

export function unreadPartnerActivityCount(items: PartnerActivityItem[]): number {
  return items.filter((item) => !item.read).length;
}

/** Story 7.1 — columnas exportables a CSV (`Export.dc.html`), en su orden. */
export const GUEST_EXPORT_COLUMNS = [
  { key: "name", label: "Guest name", defaultChecked: true },
  { key: "arrival", label: "Arrival time and check-in time", defaultChecked: true },
  { key: "reference", label: "LP reference", defaultChecked: true },
  { key: "status", label: "Attendance status", defaultChecked: true },
  { key: "contact", label: "Email and phone", defaultChecked: true },
  { key: "specialRequests", label: "Special requests", defaultChecked: false },
] as const;

export type GuestExportColumnKey = (typeof GUEST_EXPORT_COLUMNS)[number]["key"];

export const DEFAULT_GUEST_EXPORT_COLUMNS: GuestExportColumnKey[] = GUEST_EXPORT_COLUMNS.filter(
  (c) => c.defaultChecked,
).map((c) => c.key);

const EXPORT_STATUS_LABEL: Record<PartnerGuestStatus, string> = {
  arrived: "Arrived",
  pending: "Pending",
  "no-show": "No-show",
  "new-booking": "Pending",
  cancelled: "Cancelled",
};

/** Genera el CSV real que descarga "Export CSV" — sigue los filtros de pantalla. */
export function guestListToCsv(
  guests: PartnerGuest[],
  columns: readonly GuestExportColumnKey[] = DEFAULT_GUEST_EXPORT_COLUMNS,
): string {
  const labels = GUEST_EXPORT_COLUMNS.filter((c) => columns.includes(c.key));
  const header = labels.map((c) => c.label).join(",");

  const rows = guests.map((guest) => {
    const cells: Record<GuestExportColumnKey, string> = {
      name: guest.name,
      arrival: guest.arrivalTime,
      reference: guest.id,
      status: EXPORT_STATUS_LABEL[guest.status],
      contact: `${guest.email} ${guest.phone}`,
      specialRequests: guest.specialRequests,
    };
    return labels.map((c) => `"${cells[c.key].replace(/"/g, '""')}"`).join(",");
  });

  return [header, ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/* Story 7.3 — Partner Analytics (`Analytics.dc.html`)                 */
/* ------------------------------------------------------------------ */

/**
 * Economía de partner asumida en la Fase 2 (a confirmar con En Soleil):
 * day pass a $75.00 (Fase 5), visita de membresía a tarifa de partner de
 * $38.00, y la mitad de la tarifa de no-show de $35.00 ($17.50) para el
 * partner.
 */
export const DAY_PASS_PARTNER_RATE = 75;
export const MEMBERSHIP_VISIT_PARTNER_RATE = 38;
export const NO_SHOW_FEE = 35;
export const NO_SHOW_PARTNER_SHARE = NO_SHOW_FEE / 2;

/** "Bookings a day" — September 1–14, month to date. El día 14 es hoy. */
export const MONTHLY_BOOKINGS_BY_DAY = [9, 8, 10, 12, 14, 18, 21, 10, 9, 11, 12, 14, 23, 15];
export const TODAY_DAY_OF_MONTH = 14;

/** "When they come" — arrivals by day of the week, suma exacta 187. */
export const ARRIVALS_BY_WEEKDAY = [
  { day: "Mon", guests: 17 },
  { day: "Tue", guests: 21 },
  { day: "Wed", guests: 25 },
  { day: "Thu", guests: 28 },
  { day: "Fri", guests: 41 },
  { day: "Sat", guests: 36 },
  { day: "Sun", guests: 19 },
];

export const MONTHLY_BOOKINGS_TOTAL = ARRIVALS_BY_WEEKDAY.reduce((sum, d) => sum + d.guests, 0);

export const ANALYTICS_SUMMARY = {
  bookings: MONTHLY_BOOKINGS_TOTAL,
  bookingsLastMonthSameDays: 162,
  dayPassVisits: 53,
  membershipVisits: 118,
  noShows: 9,
  cancellations: 7,
  revenueVsAugust: 742.0,
};

export const GUESTS_WHO_ARRIVED = ANALYTICS_SUMMARY.dayPassVisits + ANALYTICS_SUMMARY.membershipVisits;

export const REVENUE_BREAKDOWN = {
  dayPasses: ANALYTICS_SUMMARY.dayPassVisits * DAY_PASS_PARTNER_RATE,
  membershipVisits: ANALYTICS_SUMMARY.membershipVisits * MEMBERSHIP_VISIT_PARTNER_RATE,
  noShowFees: ANALYTICS_SUMMARY.noShows * NO_SHOW_PARTNER_SHARE,
};

export const TOTAL_REVENUE_ATTRIBUTED =
  REVENUE_BREAKDOWN.dayPasses + REVENUE_BREAKDOWN.membershipVisits + REVENUE_BREAKDOWN.noShowFees;

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export type AnalyticsRange = "week" | "month";

/** El segmented Week/Month decide cuántos de los 14 días del gráfico se ven. */
export function bookingsForRange(range: AnalyticsRange): number[] {
  return range === "week" ? MONTHLY_BOOKINGS_BY_DAY.slice(-7) : MONTHLY_BOOKINGS_BY_DAY;
}

/** Story 7.3 — "revenue attribution from Luxe Pass bookings", CSV descargable. */
export function revenueBreakdownToCsv(): string {
  const rows = [
    ["Day passes", String(ANALYTICS_SUMMARY.dayPassVisits), formatCurrency(DAY_PASS_PARTNER_RATE), formatCurrency(REVENUE_BREAKDOWN.dayPasses)],
    [
      "Membership visits",
      String(ANALYTICS_SUMMARY.membershipVisits),
      formatCurrency(MEMBERSHIP_VISIT_PARTNER_RATE),
      formatCurrency(REVENUE_BREAKDOWN.membershipVisits),
    ],
    [
      "Shared no-show fees",
      String(ANALYTICS_SUMMARY.noShows),
      formatCurrency(NO_SHOW_PARTNER_SHARE),
      formatCurrency(REVENUE_BREAKDOWN.noShowFees),
    ],
    ["Total", "", "", formatCurrency(TOTAL_REVENUE_ATTRIBUTED)],
  ];

  const header = "Category,Visits,Rate,Amount";
  return [header, ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
}

/* ------------------------------------------------------------------ */
/* Story 7.3 — Repeat Guest Identification (`RepeatGuests.dc.html`)    */
/* ------------------------------------------------------------------ */

export type LoyaltyTier = "regular" | "returning" | "first-visit";

export function loyaltyTier(visits: number): LoyaltyTier {
  if (visits >= 5) return "regular";
  if (visits >= 2) return "returning";
  return "first-visit";
}

export const LOYALTY_TIER_LABEL: Record<LoyaltyTier, string> = {
  regular: "Regular",
  returning: "Returning",
  "first-visit": "First visit",
};

export interface RepeatGuestRow {
  name: string;
  email: string;
  visits: number;
  lastVisitLabel: string;
  firstVisitLabel: string;
  attributed: number;
}

export const REPEAT_GUESTS: RepeatGuestRow[] = [
  { name: "Alexandra Rivas", email: "alexandra.rivas@example.com", visits: 12, lastVisitLabel: "Today · 3:30 PM", firstVisitLabel: "March 2024", attributed: 456 },
  { name: "Beatrice Nolan", email: "beatrice.nolan@example.com", visits: 9, lastVisitLabel: "Today · 3:00 PM", firstVisitLabel: "May 2024", attributed: 342 },
  { name: "Jonah Whitfield", email: "jonah.whitfield@example.com", visits: 7, lastVisitLabel: "Today · 11:00 AM", firstVisitLabel: "January 2025", attributed: 266 },
  { name: "Marcus Ellery", email: "marcus.ellery@example.com", visits: 6, lastVisitLabel: "Today · 9:00 AM", firstVisitLabel: "February 2025", attributed: 228 },
  { name: "Rowan Achebe", email: "rowan.achebe@example.com", visits: 5, lastVisitLabel: "Today · 12:30 PM", firstVisitLabel: "April 2025", attributed: 190 },
  { name: "Idris Fontaine", email: "idris.fontaine@example.com", visits: 4, lastVisitLabel: "Today · 4:30 PM", firstVisitLabel: "June 2025", attributed: 152 },
  { name: "Theo Lindqvist", email: "theo.lindqvist@example.com", visits: 3, lastVisitLabel: "Today · 10:00 AM", firstVisitLabel: "July 2025", attributed: 114 },
  { name: "Sofia Marchetti", email: "sofia.marchetti@example.com", visits: 2, lastVisitLabel: "Today · 1:30 PM", firstVisitLabel: "August 2025", attributed: 76 },
  { name: "Priya Raghunathan", email: "priya.raghunathan@example.com", visits: 2, lastVisitLabel: "Today · 9:00 AM", firstVisitLabel: "August 2025", attributed: 76 },
  { name: "Elena Vasquez", email: "elena.vasquez@example.com", visits: 1, lastVisitLabel: "Today · 12:00 PM", firstVisitLabel: "Today", attributed: 75 },
];

export const REPEAT_GUESTS_SUMMARY = {
  totalMembers: 412,
  cameBackAtLeastOnce: 148,
};

export const RETURN_RATE =
  Math.round((REPEAT_GUESTS_SUMMARY.cameBackAtLeastOnce / REPEAT_GUESTS_SUMMARY.totalMembers) * 1000) / 10;

export const AVERAGE_VISITS_PER_GUEST = 3.2;

/** Story 7.1 — "search/filter": coincide por nombre o email. */
export function matchesRepeatGuestQuery(guest: RepeatGuestRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return guest.name.toLowerCase().includes(normalized) || guest.email.toLowerCase().includes(normalized);
}

export type RepeatGuestFilter = "everyone" | "came-back" | "first-visit";

export function filterRepeatGuests(guests: RepeatGuestRow[], filter: RepeatGuestFilter): RepeatGuestRow[] {
  if (filter === "came-back") return guests.filter((g) => g.visits >= 2);
  if (filter === "first-visit") return guests.filter((g) => g.visits === 1);
  return guests;
}

export function repeatGuestsToCsv(guests: RepeatGuestRow[]): string {
  const header = "Guest name,Email,Visits here,Last visit,First visit,Loyalty,Attributed";
  const rows = guests.map((g) =>
    [g.name, g.email, String(g.visits), g.lastVisitLabel, g.firstVisitLabel, LOYALTY_TIER_LABEL[loyaltyTier(g.visits)], formatCurrency(g.attributed)]
      .map((cell) => `"${cell.replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/* Story 7.3 — Reports (`Reports.dc.html`)                             */
/* ------------------------------------------------------------------ */

export interface PartnerReport {
  id: string;
  title: string;
  description: string;
  formats: string;
}

export const PARTNER_REPORTS: PartnerReport[] = [
  {
    id: "daily-guest-list",
    title: "Daily guest list",
    description:
      "Who was expected, who arrived, who did not — one row per guest, for any day or range of days.",
    formats: "CSV · PDF",
  },
  {
    id: "weekly-booking-volume",
    title: "Weekly booking volume",
    description: "Bookings, arrivals, no-shows and cancellations by day, week over week.",
    formats: "CSV",
  },
  {
    id: "monthly-booking-volume",
    title: "Monthly booking volume",
    description: "The same figures by month, with the twelve-month trend beside them.",
    formats: "CSV",
  },
  {
    id: "revenue-attribution",
    title: "Revenue attribution",
    description:
      "Day passes, membership visits and shared no-show fees, month by month, against the statements you were paid.",
    formats: "CSV",
  },
  {
    id: "repeat-guests",
    title: "Repeat guests",
    description: "Every member who booked here, with visit count, first and last visit.",
    formats: "CSV",
  },
  {
    id: "no-show-log",
    title: "No-show log",
    description: "Every reported no-show with the reason recorded and the note left with it.",
    formats: "CSV",
  },
];

export const DEFAULT_REPORT_ID: PartnerReport["id"] = "monthly-booking-volume";

export interface RecentDownload {
  filename: string;
  meta: string;
}

export const RECENT_DOWNLOADS: RecentDownload[] = [
  { filename: "ainsworth-guest-list-2026-09-13.csv", meta: "Yesterday, 11:04 PM · by Dana O. · 14 rows" },
  { filename: "ainsworth-revenue-august.csv", meta: "September 5 · by Marisol T. · 31 rows" },
  { filename: "ainsworth-repeat-guests-q3.csv", meta: "September 1 · by Marisol T. · 412 rows" },
];

export const REPORT_DELIVERY_OPTIONS = [
  { value: "download", label: "Download now", description: "Straight to this computer as a CSV file." },
  {
    value: "email-team",
    label: "Email it to the team",
    description: "To everyone on the notification list for this venue.",
  },
  {
    value: "monthly",
    label: "Send it every month",
    description: "On the 1st, for the month just finished.",
  },
] as const;
