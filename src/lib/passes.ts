import { SAMPLE_MEMBER } from "./member";

/**
 * Story 5.1 (Digital Pass Generation), 5.2 (Lounge Check-In Process) y 5.3
 * (Booking Reminder). Sin backend: "My Pass", el pase digital y la consola de
 * recepción son datos de muestra deterministas, independientes del borrador
 * de `booking-context.tsx` — igual que `lounge-profile.ts` fija literalmente
 * el contacto y las reseñas de The Ainsworth en vez de derivarlos del motor
 * de disponibilidad. La referencia LP-842193 de aquí es la misma que citan
 * los artboards de la Fase 6, no la que calcula `bookingReference`.
 */

/* ------------------------------------------------------------------ */
/* El pase digital — Story 5.1                                         */
/* ------------------------------------------------------------------ */

export const PASS_LIFECYCLE_STATES = ["upcoming", "today", "checked-in", "expired"] as const;

export type PassLifecycleState = (typeof PASS_LIFECYCLE_STATES)[number];

export function isPassLifecycleState(value: unknown): value is PassLifecycleState {
  return (
    typeof value === "string" &&
    (PASS_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

export interface DigitalPass {
  reference: string;
  loungeName: string;
  address: string;
  receptionNote: string;
  dateLabel: string;
  shortDateLabel: string;
  /** "September 14" — pie del QR atenuado en el estado expirado. */
  monthDayLabel: string;
  arrivalTime: string;
  windowCloseTime: string;
  stayHours: number;
  admission: string;
  bookedOnLabel: string;
  amountPaidLabel: string;
  specialRequests: string;
  directionsMinutes: number;
  checkedInAt: string;
  checkedInBy: string;
}

/** El pase que dibujan `Main`, `ArrivalDay`, `CheckedIn` y `Expired.dc.html`. */
export const AINSWORTH_PASS: DigitalPass = {
  reference: "LP-842193",
  loungeName: "The Ainsworth",
  address: "122 E 45th St, New York, NY 10017",
  receptionNote: "Reception on Level 2",
  dateLabel: "Saturday, September 14",
  shortDateLabel: "Sat, Sep 14",
  monthDayLabel: "September 14",
  arrivalTime: "3:30 PM",
  windowCloseTime: "7:30 PM",
  stayHours: 4,
  admission: "1 member",
  bookedOnLabel: "September 12",
  amountPaidLabel: "$81.66 paid",
  specialRequests: "Quiet desk near a window if possible, and a still water on arrival.",
  directionsMinutes: 14,
  checkedInAt: "3:34 PM",
  checkedInBy: "Dana O.",
};

/* ------------------------------------------------------------------ */
/* My Pass — lista de reservas (`MyBookings.dc.html` / `NoShow.dc.html`) */
/* ------------------------------------------------------------------ */

export type UpcomingBookingStatus = "confirmed" | "waitlisted";

export interface UpcomingBooking {
  reference: string | null;
  loungeName: string;
  statusLabel: string;
  status: UpcomingBookingStatus;
  dateTimeLabel: string;
  addressLine: string | null;
  /** Solo la próxima visita tiene un pase completo (`Main.dc.html`). */
  passHref: string | null;
}

export const UPCOMING_BOOKINGS: UpcomingBooking[] = [
  {
    reference: AINSWORTH_PASS.reference,
    loungeName: AINSWORTH_PASS.loungeName,
    statusLabel: "Confirmed",
    status: "confirmed",
    dateTimeLabel: "Saturday, September 14 · arrive 3:30 PM · stay up to 4 hours",
    addressLine: `${AINSWORTH_PASS.address} · ${AINSWORTH_PASS.receptionNote}`,
    passHref: `/my-pass/${AINSWORTH_PASS.reference}`,
  },
  {
    reference: "LP-849017",
    loungeName: "Bergdorf Lounge",
    statusLabel: "Confirmed",
    status: "confirmed",
    dateTimeLabel: "Wednesday, October 2 · arrive 11:00 AM",
    addressLine: null,
    passHref: null,
  },
  {
    reference: null,
    loungeName: "The Ainsworth",
    statusLabel: "Waitlisted · no pass yet",
    status: "waitlisted",
    dateTimeLabel: "Wednesday, October 9 · 6:00 PM · position 2 on the waitlist",
    addressLine: null,
    passHref: null,
  },
];

export type PastBookingOutcome = "attended" | "no-show";

export interface PastBooking {
  reference: string;
  loungeName: string;
  dateTimeLabel: string;
  outcome: PastBookingOutcome;
  /** Solo el no-show explica qué pasó y qué cobró — `NoShow.dc.html`. */
  explanation?: string;
}

export const PAST_BOOKINGS: PastBooking[] = [
  {
    reference: AINSWORTH_PASS.reference,
    loungeName: AINSWORTH_PASS.loungeName,
    dateTimeLabel: "Saturday, September 14 · checked in 3:34 PM",
    outcome: "attended",
  },
  {
    reference: "LP-828416",
    loungeName: "Bergdorf Lounge",
    dateTimeLabel: "Friday, August 30 · arrival 7:00 PM",
    outcome: "no-show",
    explanation:
      "The booking window closed at 11:00 PM without a check-in. The visit still counted toward August, and the day pass was not refunded — that is the cancellation policy you accepted at booking. Cancelling more than 24 hours ahead always avoids this.",
  },
  {
    reference: "LP-821740",
    loungeName: AINSWORTH_PASS.loungeName,
    dateTimeLabel: "Thursday, August 22 · checked in 12:06 PM",
    outcome: "attended",
  },
];

/** "3 of 8" — rail de la pestaña Upcoming (`MyBookings.dc.html`). */
export const VISITS_THIS_MONTH = { used: 3, included: 8 };

/** Rail "Last 90 days" de la pestaña Past (`NoShow.dc.html`). */
export const LAST_90_DAYS_SUMMARY = {
  attended: 12,
  noShows: 2,
  cancelledInTime: 1,
};

/* ------------------------------------------------------------------ */
/* Consola de recepción — Story 5.2 (`Reception.dc.html` / `CheckInError.dc.html`) */
/* ------------------------------------------------------------------ */

export interface ReceptionBooking {
  reference: string;
  memberName: string;
  memberInitials: string;
  memberSince: string;
  visitCount: number;
  email: string;
  bookedArrival: string;
  bookedAgo: string;
  /** "3:34 PM" — cuándo se escaneó o buscó el código (`Reception.dc.html`). */
  scannedAt: string;
  windowCloseTime: string;
  admission: string;
  specialRequests: string;
  emergencyContact: string;
}

const RECEPTION_VALID_BOOKING: ReceptionBooking = {
  reference: AINSWORTH_PASS.reference,
  memberName: SAMPLE_MEMBER.name,
  memberInitials: SAMPLE_MEMBER.initials,
  memberSince: "March 2024",
  visitCount: 27,
  email: SAMPLE_MEMBER.email,
  bookedArrival: AINSWORTH_PASS.arrivalTime,
  bookedAgo: "4 min ago",
  scannedAt: AINSWORTH_PASS.checkedInAt,
  windowCloseTime: AINSWORTH_PASS.windowCloseTime,
  admission: "1 member · no guests",
  specialRequests: AINSWORTH_PASS.specialRequests,
  emergencyContact: "Miriam Rivas · sister · +1 (555) 402-7788",
};

export function findReceptionBooking(code: string): ReceptionBooking | undefined {
  const normalized = code.trim().toUpperCase();

  return normalized === RECEPTION_VALID_BOOKING.reference ? RECEPTION_VALID_BOOKING : undefined;
}

export interface ReceptionCloseMatch {
  reference: string;
  memberName: string;
  memberInitials: string;
  note: string;
}

/** "Close matches for today" de `CheckInError.dc.html`. */
export const RECEPTION_CLOSE_MATCHES: ReceptionCloseMatch[] = [
  {
    reference: "LP-842197",
    memberName: "Marcus Vidal",
    memberInitials: "MV",
    note: "Arrival 4:00 PM · not arrived yet",
  },
  {
    reference: RECEPTION_VALID_BOOKING.reference,
    memberName: RECEPTION_VALID_BOOKING.memberName,
    memberInitials: RECEPTION_VALID_BOOKING.memberInitials,
    note: "Checked in at 3:34 PM · in the lounge",
  },
];

export const RECEPTION_TODAY_SUMMARY = { expected: 14, checkedIn: 9 };
