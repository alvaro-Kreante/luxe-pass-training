/**
 * Epic 8 — Admin & Support. Story 8.1 (Fase 2, `epic-8-admin-support/`):
 * consola de soporte, ficha de miembro y caso con log de comunicación.
 *
 * Continúa la línea temporal del Epic 7: lunes 16 de septiembre por la
 * mañana, dos días después del turno de The Ainsworth. El caso central es
 * el no-show de Camille Duforest en The Ainsworth (LP-840388, $35.00),
 * ya visto desde el partner en `lib/partner.ts`.
 */

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export const ADMIN_STAFF = {
  name: "Priya Raghunathan",
  initials: "P",
  roleLabel: "Support lead · En Soleil",
};

export const DUTY_MANAGER = {
  name: "Dana Mbeki",
  initials: "DM",
  roleLabel: "Duty manager today · 3 open escalations",
};

/** Story 8.1 — "Escalation to manager functionality": el límite sin manager. */
export const MANAGER_APPROVAL_LIMIT = 100;

export type CaseStatus = "new" | "open" | "waiting" | "escalated" | "resolved";

export interface SupportCase {
  id: string;
  memberId: string;
  memberName: string;
  memberInitials: string;
  membershipLabel: string;
  subject: string;
  note: string;
  openedLabel: string;
  openedTimeLabel: string;
  status: CaseStatus;
  assignee: string | null;
  bookingReference?: string;
}

/**
 * Las 8 filas de `Main.dc.html`, de las 30 que anuncia el pie de la lista.
 * Los recuentos (`ADMIN_CASE_COUNTS`) son los que cita el propio artboard,
 * no una suma de este array — como ya hacía `PARTNER_GUESTS` con su turno.
 */
export const SUPPORT_CASES: SupportCase[] = [
  {
    id: "CS-4417",
    memberId: "camille-duforest",
    memberName: "Camille Duforest",
    memberInitials: "CD",
    membershipLabel: "Annual member",
    subject: "No-show fee disputed — LP-840388",
    note: "Opened by the no-show report from The Ainsworth",
    openedLabel: "Today",
    openedTimeLabel: "9:12 AM",
    status: "new",
    assignee: null,
    bookingReference: "LP-840388",
  },
  {
    id: "CS-4416",
    memberId: "marcus-deyn",
    memberName: "Marcus Deyn",
    memberInitials: "MD",
    membershipLabel: "Annual member",
    subject: "Card declined on renewal",
    note: "Membership lapses in 4 days",
    openedLabel: "Today",
    openedTimeLabel: "8:47 AM",
    status: "open",
    assignee: "Priya R.",
  },
  {
    id: "CS-4415",
    memberId: "alexandra-rivas",
    memberName: "Alexandra Rivas",
    memberInitials: "AR",
    membershipLabel: "Annual member",
    subject: "Receipt not received — LP-842193",
    note: "Resent Sunday · asked her to check spam",
    openedLabel: "Sep 15",
    openedTimeLabel: "6:31 PM",
    status: "waiting",
    assignee: "Priya R.",
    bookingReference: "LP-842193",
  },
  {
    id: "CS-4412",
    memberId: "harriet-osei",
    memberName: "Harriet Osei",
    memberInitials: "HO",
    membershipLabel: "Annual member",
    subject: "Cancelled inside 24 hours — asks for a waiver",
    note: "Second waiver request in twelve months",
    openedLabel: "Sep 15",
    openedTimeLabel: "2:05 PM",
    status: "escalated",
    assignee: "Dana M.",
  },
  {
    id: "CS-4409",
    memberId: "jonah-whitfield",
    memberName: "Jonah Whitfield",
    memberInitials: "JW",
    membershipLabel: "Annual member",
    subject: "Wants Thursday moved to Bergdorf Lounge",
    note: "Bergdorf is fully booked at 10:00 AM",
    openedLabel: "Sep 15",
    openedTimeLabel: "11:20 AM",
    status: "open",
    assignee: "Theo B.",
  },
  {
    id: "CS-4404",
    memberId: "naomi-feldstein",
    memberName: "Naomi Feldstein",
    memberInitials: "NF",
    membershipLabel: "Annual member",
    subject: "Showers out of service on arrival",
    note: "The Ainsworth · amenity flagged for review",
    openedLabel: "Sep 14",
    openedTimeLabel: "4:58 PM",
    status: "open",
    assignee: "Dana M.",
  },
  {
    id: "CS-4398",
    memberId: "elena-vasquez",
    memberName: "Elena Vasquez",
    memberInitials: "EV",
    membershipLabel: "Day pass",
    subject: "Day pass charged twice — $163.32",
    note: "Duplicate authorisation confirmed by Stripe",
    openedLabel: "Sep 14",
    openedTimeLabel: "1:12 PM",
    status: "escalated",
    assignee: "Priya R.",
  },
  {
    id: "CS-4391",
    memberId: "rowan-achebe",
    memberName: "Rowan Achebe",
    memberInitials: "RA",
    membershipLabel: "Annual member",
    subject: "Membership pause request",
    note: "Paused until November 1 · confirmed by email",
    openedLabel: "Sep 13",
    openedTimeLabel: "5:40 PM",
    status: "resolved",
    assignee: "Theo B.",
  },
];

export const ADMIN_CASE_COUNTS = {
  open: 22,
  waitingOnMember: 5,
  escalated: 3,
  resolvedToday: 9,
  totalCases: 30,
  shown: SUPPORT_CASES.length,
};

export function getSupportCase(id: string): SupportCase | undefined {
  return SUPPORT_CASES.find((supportCase) => supportCase.id === id);
}

export interface AdminMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  membershipLabel: "Annual" | "Day pass";
  status: "active" | "no-membership";
  memberSinceLabel: string;
  openCasesCount: number;
  lastVisitLabel: string;
  lastVisitNote: string;
}

/**
 * Los 3 resultados de `MemberSearch.dc.html` para "duforest": coinciden en
 * nombre y email — la ficha de nota fija por qué Renée no lleva chip de
 * caso abierto ni membresía.
 */
export const ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "camille-duforest",
    name: "Camille Duforest",
    initials: "CD",
    email: "camille.duforest@example.com",
    phone: "+1 (555) 668-4172",
    membershipLabel: "Annual",
    status: "active",
    memberSinceLabel: "member since March 2025",
    openCasesCount: 1,
    lastVisitLabel: "Sep 14",
    lastVisitNote: "no-show",
  },
  {
    id: "theo-duforest-marin",
    name: "Théo Duforest-Marin",
    initials: "TD",
    email: "theo.duforest@example.com",
    phone: "+1 (555) 668-9930",
    membershipLabel: "Annual",
    status: "active",
    memberSinceLabel: "member since January 2026",
    openCasesCount: 0,
    lastVisitLabel: "Aug 30",
    lastVisitNote: "The Vestry",
  },
  {
    id: "renee-duforest",
    name: "Renée Duforest",
    initials: "RD",
    email: "renee.duforest@example.com",
    phone: "+1 (555) 204-1188",
    membershipLabel: "Day pass",
    status: "no-membership",
    memberSinceLabel: "day passes only, never subscribed",
    openCasesCount: 0,
    lastVisitLabel: "Jul 22",
    lastVisitNote: "Aurelia House",
  },
];

/**
 * Story 8.1 — "Member search by email, phone, or name". Reglas fijadas por
 * `DESIGN-SYSTEM.md` §6 (Fase 8): coincidencia parcial por palabra en nombre
 * o email, los últimos cuatro dígitos del teléfono bastan (sin formato), y
 * una referencia de reserva ("LP-840388") va directa al miembro dueño de esa
 * reserva a través de `SUPPORT_CASES`.
 */
export function searchMembers(query: string): AdminMember[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const bookingRefMatch = trimmed.toUpperCase();
  if (/^LP-\d+$/.test(bookingRefMatch)) {
    const matchingCase = SUPPORT_CASES.find((c) => c.bookingReference === bookingRefMatch);
    if (matchingCase) {
      const member = ADMIN_MEMBERS.find((m) => m.id === matchingCase.memberId);
      return member ? [member] : [];
    }
    return [];
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  const q = trimmed.toLowerCase();

  return ADMIN_MEMBERS.filter((member) => {
    const haystack = `${member.name} ${member.email}`.toLowerCase();
    if (haystack.includes(q)) return true;

    if (digitsOnly.length >= 4) {
      const memberDigits = member.phone.replace(/\D/g, "");
      if (memberDigits.endsWith(digitsOnly)) return true;
    }

    return false;
  });
}

/**
 * Rail "Opened by you today" de `MemberSearch.dc.html` — sus horas propias
 * (cuándo Priya entró a mirar la ficha) no coinciden con `openedTimeLabel`
 * de `SUPPORT_CASES` (cuándo se abrió el caso), así que quedan aparte en vez
 * de forzar un único campo a significar las dos cosas.
 */
export const OPENED_BY_YOU_TODAY: {
  caseId: string;
  memberName: string;
  memberInitials: string;
  timeLabel: string;
}[] = [
  { caseId: "CS-4416", memberName: "Marcus Deyn", memberInitials: "MD", timeLabel: "9:58 AM" },
  { caseId: "CS-4398", memberName: "Elena Vasquez", memberInitials: "EV", timeLabel: "9:31 AM" },
  { caseId: "CS-4415", memberName: "Alexandra Rivas", memberInitials: "AR", timeLabel: "8:52 AM" },
];

export function getAdminMember(id: string): AdminMember | undefined {
  return ADMIN_MEMBERS.find((member) => member.id === id);
}

export type BookingHistoryStatus = "confirmed" | "no-show" | "completed" | "cancelled";

export interface BookingHistoryRow {
  dateLabel: string;
  dayLabel: string;
  lounge: string;
  detail: string;
  reference: string;
  status: BookingHistoryStatus;
  charged: string;
}

export interface PaymentRow {
  title: string;
  detail: string;
  amount: string;
}

export interface UpcomingBooking {
  lounge: string;
  area: string;
  detail: string;
  reference: string;
}

export interface MemberProfile extends AdminMember {
  visits: number;
  visitsNote: string;
  noShows: number;
  noShowsNote: string;
  paidToDate: string;
  paidNote: string;
  openCasesNote: string;
  membershipPriceLabel: string;
  renewsLabel: string;
  visitsThisMonthLabel: string;
  referralsLabel: string;
  bookingHistory: BookingHistoryRow[];
  bookingHistorySummary: string;
  payments: PaymentRow[];
  paidToDateNote: string;
  upcomingBooking: UpcomingBooking | null;
}

/**
 * Camille Duforest es la única ficha literal de `MemberProfile.dc.html` — el
 * resto del catálogo (`ADMIN_MEMBERS`) deriva un perfil mínimo de sus propios
 * datos de búsqueda en `getMemberProfile`, mismo criterio que ya fija
 * `lounge-profile.ts` para el contacto y las reseñas del Epic 3.
 */
const LITERAL_MEMBER_PROFILES: Record<string, MemberProfile> = {
  "camille-duforest": {
    ...ADMIN_MEMBERS[0],
    visits: 6,
    visitsNote: "across 4 lounges since March",
    noShows: 1,
    noShowsNote: "of 3 in twelve months before a pause",
    paidToDate: formatCurrency(2516.66),
    paidNote: "membership, one day pass, one fee",
    openCasesNote: "CS-4417 · opened today 9:12 AM",
    membershipPriceLabel: `${formatCurrency(2400)} per year`,
    renewsLabel: "March 3 · auto-renew on",
    visitsThisMonthLabel: "2 of 8 used",
    referralsLabel: "1 joined",
    bookingHistorySummary:
      "Showing 6 of 9 bookings since March 2025 · 6 attended, 1 no-show, 1 cancelled, 1 upcoming",
    paidToDateNote: "Paid to date · no refunds yet",
    upcomingBooking: {
      lounge: "Aurelia House",
      area: "NoMad",
      detail: "Friday, September 20 · arrive 9:30 AM · admission for one",
      reference: "LP-844021",
    },
    bookingHistory: [
      {
        dateLabel: "Sep 20",
        dayLabel: "Friday",
        lounge: "Aurelia House",
        detail: "NoMad · arrive 9:30 AM",
        reference: "LP-844021",
        status: "confirmed",
        charged: "Included",
      },
      {
        dateLabel: "Sep 14",
        dayLabel: "Saturday",
        lounge: "The Ainsworth",
        detail: "Midtown East · booked 10:30 AM · window closed 2:30 PM",
        reference: "LP-840388",
        status: "no-show",
        charged: `${formatCurrency(35)} fee`,
      },
      {
        dateLabel: "Sep 6",
        dayLabel: "Friday",
        lounge: "Bergdorf Lounge",
        detail: "Midtown · arrived 10:04 AM",
        reference: "LP-839114",
        status: "completed",
        charged: "Included",
      },
      {
        dateLabel: "Aug 28",
        dayLabel: "Wednesday",
        lounge: "The Vestry",
        detail: "Tribeca · arrived 2:12 PM",
        reference: "LP-836902",
        status: "completed",
        charged: "Included",
      },
      {
        dateLabel: "Aug 19",
        dayLabel: "Monday",
        lounge: "Aurelia House",
        detail: "NoMad · cancelled 3 days ahead",
        reference: "LP-834517",
        status: "cancelled",
        charged: "No charge",
      },
      {
        dateLabel: "Aug 11",
        dayLabel: "Sunday",
        lounge: "The Ainsworth",
        detail: "Midtown East · 9th visit of the month, bought as a day pass",
        reference: "LP-832240",
        status: "completed",
        charged: formatCurrency(81.66),
      },
    ],
    payments: [
      {
        title: "No-show fee — The Ainsworth",
        detail: "Sep 14 · Visa 4242 · ch_3PkR2f8Q",
        amount: formatCurrency(35),
      },
      {
        title: "Day pass — The Ainsworth",
        detail: "Aug 11 · Visa 4242 · $75.00 + $6.66 tax",
        amount: formatCurrency(81.66),
      },
      {
        title: "Annual membership",
        detail: "Mar 3 · Visa 4242 · tax included",
        amount: formatCurrency(2400),
      },
    ],
  },
};

export function getMemberProfile(id: string): MemberProfile | undefined {
  const literal = LITERAL_MEMBER_PROFILES[id];
  if (literal) return literal;

  const member = getAdminMember(id);
  if (!member) return undefined;

  return {
    ...member,
    visits: 1,
    visitsNote: `at ${member.lastVisitNote}`,
    noShows: 0,
    noShowsNote: "none on file",
    paidToDate: member.status === "no-membership" ? formatCurrency(0) : member.membershipLabel,
    paidNote: "no other bookings on file",
    openCasesNote: member.openCasesCount > 0 ? "open case on file" : "no open cases",
    membershipPriceLabel: member.status === "no-membership" ? "Not a subscriber" : "Annual member",
    renewsLabel: "—",
    visitsThisMonthLabel: "—",
    referralsLabel: "—",
    bookingHistorySummary: `Showing the 1 booking on file · last visit ${member.lastVisitLabel}`,
    paidToDateNote: "No refunds on file",
    upcomingBooking: null,
    bookingHistory: [
      {
        dateLabel: member.lastVisitLabel,
        dayLabel: "",
        lounge: member.lastVisitNote,
        detail: "",
        reference: "—",
        status: "completed",
        charged: "—",
      },
    ],
    payments: [],
  };
}

export type CommLogEntryKind = "system" | "email-auto" | "member" | "internal-note" | "partner" | "staff-reply";

export interface CommLogEntryData {
  id: string;
  kind: CommLogEntryKind;
  author: string;
  timestampLabel: string;
  body: string;
}

export interface CaseDetail extends SupportCase {
  commLog: CommLogEntryData[];
  resolutionReasons: string[];
  defaultResolutionReason: string;
  defaultResolutionNote: string;
  /** Solo CS-4417 modela un reembolso concreto — ver desviaciones en el mapa. */
  refundableAmount?: number;
  chargeDetail?: { title: string; cardLabel: string; dateLabel: string; chargeId: string };
  partnerShareAmount?: number;
}

const LITERAL_CASE_DETAILS: Record<string, Omit<CaseDetail, keyof SupportCase>> = {
  "CS-4417": {
    commLog: [
      {
        id: "c1",
        kind: "system",
        author: "System · no-show reported",
        timestampLabel: "Sat Sep 14 · 4:02 PM",
        body:
          "The Ainsworth (Dana O.) reported the 10:30 AM arrival as a no-show. The admission window closed at 2:30 PM. The flat fee of $35.00 was charged to the card on file, Visa 4242.",
      },
      {
        id: "c2",
        kind: "email-auto",
        author: "Email sent to member · automatic",
        timestampLabel: "Sat Sep 14 · 4:03 PM",
        body: '"No-show recorded — The Ainsworth, September 14"',
      },
      {
        id: "c3",
        kind: "member",
        author: "Camille Duforest · by email",
        timestampLabel: "Today · 9:12 AM",
        body:
          "I did go. I was at the door at 10:35 and the person at reception told me they were at capacity and to come back later. I came back a little after 1 PM and got the same answer. I would rather not be charged for a visit the lounge could not take.",
      },
      {
        id: "c4",
        kind: "internal-note",
        author: "Priya Raghunathan",
        timestampLabel: "Today · 9:40 AM",
        body:
          "Partner list confirms the 10:30 AM slot and no tick against her name. Asked The Ainsworth whether front of house turned people away around 10:35.",
      },
      {
        id: "c5",
        kind: "partner",
        author: "Dana O. · The Ainsworth",
        timestampLabel: "Today · 10:08 AM",
        body:
          "We were full from about 10:20 to 11:15 on Saturday and did turn a few people away at the door. If she was one of them we would not have ticked her in — the fee should not stand.",
      },
    ],
    resolutionReasons: [
      "Lounge was at capacity",
      "Member cancelled in time",
      "Technical error",
      "Goodwill exception",
    ],
    defaultResolutionReason: "Lounge was at capacity",
    defaultResolutionNote:
      "Partner confirms the door was closed between 10:20 and 11:15. Fee waived and the no-show removed from her record.",
    refundableAmount: 35,
    chargeDetail: {
      title: "No-show fee — The Ainsworth, September 14",
      cardLabel: "Visa 4242",
      dateLabel: "Charged Sat Sep 14, 4:02 PM",
      chargeId: "ch_3PkR2f8Q",
    },
    partnerShareAmount: 17.5,
  },
};

export function getCaseDetail(id: string): CaseDetail | undefined {
  const supportCase = getSupportCase(id);
  if (!supportCase) return undefined;

  const literal = LITERAL_CASE_DETAILS[id];
  if (literal) return { ...supportCase, ...literal };

  return {
    ...supportCase,
    commLog: [
      {
        id: `${id}-system`,
        kind: "system",
        author: "System · case opened",
        timestampLabel: `${supportCase.openedLabel} · ${supportCase.openedTimeLabel}`,
        body: supportCase.note,
      },
    ],
    resolutionReasons: ["Goodwill exception", "Technical error", "Not applicable"],
    defaultResolutionReason: "Goodwill exception",
    defaultResolutionNote: "",
  };
}
