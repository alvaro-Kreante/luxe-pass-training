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

/**
 * Cuenta de muestra para desarrollo local (usuario de The Ainsworth
 * Collection en `scripts/seed-partners.mjs`) — ya no valida credenciales en el cliente (Story 7.1/7.2,
 * backend real): `/partner/login` usa Supabase Auth de verdad.
 */
export const PARTNER_ACCOUNT = {
  email: "dana.okafor@theainsworth.com",
  password: "AinsworthFOH!24",
};

/** Ventana de admisión de la Fase 2: 4 horas desde la hora reservada. */
export const ADMISSION_WINDOW_HOURS = 4;

export type PartnerGuestStatus = "arrived" | "pending" | "no-show" | "new-booking" | "cancelled";

export interface PartnerGuest {
  /** También el número LP de la reserva. */
  id: string;
  /**
   * Story 7.1 — backend real: el `id` (uuid) real de `bookings`, para las
   * RPC `partner_checkin_booking`/`partner_report_no_show`
   * (`supabase/schemas/bookings.sql`). `id` de arriba sigue siendo el LP# —
   * es lo que ya muestra la UI — así que este campo es opcional: los datos
   * de muestra de las pantallas de email (`/partner/emails/*`, sin backend)
   * no lo necesitan.
   */
  bookingId?: string;
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

/* ------------------------------------------------------------------ */
/* Story 7.1 — backend real: fila de `partner_guest_list` → PartnerGuest */
/* ------------------------------------------------------------------ */

/** Shape exacto que devuelve la RPC `partner_guest_list` (`bookings.sql`). */
export interface PartnerGuestRow {
  id: string;
  confirmation_code: string;
  member_name: string;
  member_email: string | null;
  member_phone: string | null;
  band: string;
  slot_time: string;
  status: string;
  checked_in_at: string | null;
  no_show: boolean;
  no_show_reason: NoShowReason | null;
  special_requests: string;
  created_at: string;
  is_day_pass: boolean;
  visit_number: number;
  emergency_contact: string | null;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${last ?? ""}`.toUpperCase();
}

/**
 * "Until 8:30 PM" — `slot_time` + la ventana de admisión fija de 4h. No
 * distingue "Window closed" (el mock lo hacía comparando contra un reloj de
 * demo en vivo): sin un reloj real que tenga sentido comparar contra el "hoy"
 * fijo de mockup (`TODAY`), se simplifica a informativo siempre — anotado
 * como desviación consciente en docs/design/COMPONENT-MAP.md.
 */
/** "Saturday, September 14" — mismo estilo que `PARTNER_VENUE.dateLabel`, pero de una fecha real. */
export function formatLongWeekdayDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateIso}T00:00:00Z`));
}

function admissionWindowLabelFor(slotTime: string): string {
  const parsed = new Date(`2000-01-01 ${slotTime}`);
  parsed.setHours(parsed.getHours() + ADMISSION_WINDOW_HOURS);
  const formatted = parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Until ${formatted}`;
}

/** "Booked 3 days ago" / "Booked just now" — relativo a `now` (inyectable para tests). */
export function bookedAgoLabel(createdAtIso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(createdAtIso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Booked just now";
  if (minutes < 60) return `Booked ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Booked ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Booked ${days} day${days === 1 ? "" : "s"} ago`;
}

function statusFromRow(row: Pick<PartnerGuestRow, "status" | "no_show">): PartnerGuestStatus {
  if (row.status === "cancelled") return "cancelled";
  if (row.no_show) return "no-show";
  if (row.status === "in_progress" || row.status === "completed") return "arrived";
  return "pending";
}

/**
 * Convierte una fila real de `partner_guest_list` al `PartnerGuest` que ya
 * consumen `GuestListTable`/`GuestDetailDrawer`/`NoShowModal` sin cambios.
 *
 * `newlyBooked`: decoración puramente de cliente para el chip "New booking"
 * que ya distinguía el mockup — no hay un estado `new-booking` real en
 * `bookings.status` (solo 'confirmed' antes del check-in). `TodayDashboard`
 * la activa unos segundos tras recibir el INSERT de Realtime de esa reserva.
 */
export function mapGuestRow(
  row: PartnerGuestRow,
  options: { newlyBooked?: boolean; now?: Date } = {},
): PartnerGuest {
  const baseStatus = statusFromRow(row);
  const status = options.newlyBooked && baseStatus === "pending" ? "new-booking" : baseStatus;

  return {
    id: row.confirmation_code,
    bookingId: row.id,
    name: row.member_name,
    initials: initialsFromName(row.member_name),
    membershipLabel: row.is_day_pass ? "Day pass" : "Annual member",
    visitLabel: `${ordinal(row.visit_number)} visit here`,
    arrivalTime: row.slot_time,
    status,
    email: row.member_email ?? "",
    phone: row.member_phone ?? "",
    admissionWindowLabel: admissionWindowLabelFor(row.slot_time),
    admissionLabel: "1 member · no guests",
    bookedAgoLabel: bookedAgoLabel(row.created_at, options.now),
    specialRequests: row.special_requests || "No special requests noted.",
    emergencyContact: row.emergency_contact ?? undefined,
    noShowReason: row.no_show_reason ?? undefined,
  };
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

/** Fila cruda de `partner_analytics_summary` (`supabase/schemas/partner_analytics.sql`). */
export interface PartnerAnalyticsSummary {
  bookings: number;
  day_pass_visits: number;
  membership_visits: number;
  no_shows: number;
  cancellations: number;
}

export interface RevenueBreakdown {
  dayPasses: number;
  membershipVisits: number;
  noShowFees: number;
}

/** "Where the money comes from" — reutiliza las mismas tarifas asumidas de arriba, sobre cifras reales. */
export function revenueBreakdownFor(summary: PartnerAnalyticsSummary): RevenueBreakdown {
  return {
    dayPasses: summary.day_pass_visits * DAY_PASS_PARTNER_RATE,
    membershipVisits: summary.membership_visits * MEMBERSHIP_VISIT_PARTNER_RATE,
    noShowFees: summary.no_shows * NO_SHOW_PARTNER_SHARE,
  };
}

export function totalRevenueAttributed(breakdown: RevenueBreakdown): number {
  return breakdown.dayPasses + breakdown.membershipVisits + breakdown.noShowFees;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export type AnalyticsRange = "week" | "month";

/**
 * El segmented Week/Month decide cuántos días del gráfico se ven — los
 * últimos 7 o la serie completa. Backend real (22 sept 2026): `data` ya no
 * es siempre `MONTHLY_BOOKINGS_BY_DAY` — Analytics lo llama con la serie
 * real de `partner_bookings_by_day` (`supabase/schemas/partner_analytics.sql`).
 */
export function bookingsForRange(data: number[], range: AnalyticsRange): number[] {
  return range === "week" ? data.slice(-7) : data;
}

/**
 * "When they come" — agrega una serie diaria por día de la semana. Backend
 * real: sustituye a `ARRIVALS_BY_WEEKDAY` (dato de muestra) sumando la serie
 * real de `partner_bookings_by_day` por weekday, sobre el rango que se le
 * pase (Analytics pide los últimos 90 días).
 */
export function bookingsByWeekday(
  days: { day: string; bookings: number }[],
): { day: string; guests: number }[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = [0, 0, 0, 0, 0, 0, 0];

  for (const row of days) {
    const weekday = new Date(`${row.day}T00:00:00Z`).getUTCDay();
    totals[weekday] += row.bookings;
  }

  // Lunes primero, como ya dibujaba `ARRIVALS_BY_WEEKDAY`.
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({ day: labels[weekday], guests: totals[weekday] }));
}

/** Story 7.3 — "revenue attribution from Luxe Pass bookings", CSV descargable. */
export function revenueBreakdownToCsv(summary: PartnerAnalyticsSummary): string {
  const breakdown = revenueBreakdownFor(summary);
  const rows = [
    ["Day passes", String(summary.day_pass_visits), formatCurrency(DAY_PASS_PARTNER_RATE), formatCurrency(breakdown.dayPasses)],
    [
      "Membership visits",
      String(summary.membership_visits),
      formatCurrency(MEMBERSHIP_VISIT_PARTNER_RATE),
      formatCurrency(breakdown.membershipVisits),
    ],
    [
      "Shared no-show fees",
      String(summary.no_shows),
      formatCurrency(NO_SHOW_PARTNER_SHARE),
      formatCurrency(breakdown.noShowFees),
    ],
    ["Total", "", "", formatCurrency(totalRevenueAttributed(breakdown))],
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

/** Fila cruda de `partner_repeat_guests` (`supabase/schemas/partner_analytics.sql`). */
export interface PartnerRepeatGuestRow {
  member_id: string;
  member_name: string;
  member_email: string;
  visits: number;
  first_visit: string;
  last_visit: string;
  attributed: number;
}

function formatShortDate(dateIso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${dateIso}T00:00:00Z`),
  );
}

/** Convierte una fila real de `partner_repeat_guests` al `RepeatGuestRow` que ya consume `/partner/guests`. */
export function mapRepeatGuestRow(row: PartnerRepeatGuestRow): RepeatGuestRow {
  return {
    name: row.member_name,
    email: row.member_email,
    visits: row.visits,
    lastVisitLabel: formatShortDate(row.last_visit),
    firstVisitLabel: formatShortDate(row.first_visit),
    attributed: row.attributed,
  };
}

/**
 * "N members visited / N came back / return rate / average visits" — se
 * calcula sobre la lista ya cargada (cada fila de `partner_repeat_guests` es
 * un miembro con al menos una visita real), no una RPC aparte.
 */
export function repeatGuestsSummary(guests: RepeatGuestRow[]): {
  totalMembers: number;
  cameBackAtLeastOnce: number;
  returnRate: number;
  averageVisits: number;
} {
  const totalMembers = guests.length;
  const cameBackAtLeastOnce = guests.filter((g) => g.visits >= 2).length;
  const returnRate = totalMembers === 0 ? 0 : Math.round((cameBackAtLeastOnce / totalMembers) * 1000) / 10;
  const averageVisits =
    totalMembers === 0 ? 0 : Math.round((guests.reduce((sum, g) => sum + g.visits, 0) / totalMembers) * 10) / 10;

  return { totalMembers, cameBackAtLeastOnce, returnRate, averageVisits };
}

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
