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
/* My Pass — lista de reservas y su gestión (Story 5.1/5.2, extendida  */
/* por la Story 6.1 — Booking Management). `Main.dc.html`/`Cancel.dc.html`/ */
/* `CancelFee.dc.html`/`History.dc.html` de la Fase 7 rediseñan la misma */
/* pantalla que `MyBookings.dc.html`/`NoShow.dc.html` de la Fase 6: los  */
/* artboards más nuevos son los vigentes (ver COMPONENT-MAP.md).        */
/* ------------------------------------------------------------------ */

/** "flat fee" de la Story 6.1 — tanto para cancelar tarde como para el no-show. */
export const LATE_CANCELLATION_FEE_LABEL = "$35.00";
export const CANCELLATION_WINDOW_HOURS = 24;

export function isFreeCancellation(hoursUntilArrival: number): boolean {
  return hoursUntilArrival >= CANCELLATION_WINDOW_HOURS;
}

export type UpcomingBookingStatus = "in-progress" | "confirmed" | "waitlisted";

export interface UpcomingBooking {
  /** Clave estable para listas y para el cancel/cancel-fee modal. */
  id: string;
  reference: string | null;
  loungeName: string;
  statusLabel: string;
  status: UpcomingBookingStatus;
  dateTimeLabel: string;
  addressLine: string | null;
  /** Solo el pase de muestra (The Ainsworth) tiene una pantalla de pase completa. */
  passHref: string | null;
  /**
   * Horas hasta la llegada. `null` cuando cancelar no aplica: "in-progress"
   * ya hizo el check-in y "waitlisted" no tiene reserva que cancelar (usa
   * "Leave" en su lugar). Decide qué modal abre "Cancel" — `Cancel.dc.html`
   * (gratis) o `CancelFee.dc.html` (con la tarifa).
   */
  hoursUntilArrival: number | null;
  /** "Friday, September 13 at 3:30 PM" — cuándo cierra la cancelación gratuita. */
  freeCancellationDeadlineLabel: string | null;
  /** "12:00 PM" — solo con tarifa: hasta cuándo se puede llegar tarde en vez de cancelar. */
  lateArrivalWindowLabel: string | null;
}

export const UPCOMING_BOOKINGS: UpcomingBooking[] = [
  {
    id: "LP-851402",
    reference: "LP-851402",
    loungeName: "The Vestry",
    statusLabel: "In progress",
    status: "in-progress",
    dateTimeLabel: "Today · checked in at 11:04 AM · your window closes at 3:04 PM",
    addressLine: "SoHo, 41 Grand St, New York, NY 10013",
    passHref: null,
    hoursUntilArrival: null,
    freeCancellationDeadlineLabel: null,
    lateArrivalWindowLabel: null,
  },
  {
    id: "LP-850118",
    reference: "LP-850118",
    loungeName: "Bergdorf Lounge",
    statusLabel: "Confirmed",
    status: "confirmed",
    dateTimeLabel: "Tomorrow, September 13 · arrive 10:00 AM",
    addressLine: null,
    passHref: null,
    hoursUntilArrival: 19,
    freeCancellationDeadlineLabel: "today at 10:00 AM",
    lateArrivalWindowLabel: "12:00 PM",
  },
  {
    id: AINSWORTH_PASS.reference,
    reference: AINSWORTH_PASS.reference,
    loungeName: AINSWORTH_PASS.loungeName,
    statusLabel: "Confirmed",
    status: "confirmed",
    dateTimeLabel: "Saturday, September 14 · arrive 3:30 PM · free until Friday 3:30 PM",
    addressLine: null,
    passHref: `/my-pass/${AINSWORTH_PASS.reference}`,
    hoursUntilArrival: 48,
    freeCancellationDeadlineLabel: "Friday, September 13 at 3:30 PM",
    lateArrivalWindowLabel: null,
  },
  {
    id: "waitlist-ainsworth-oct9",
    reference: null,
    loungeName: "The Ainsworth",
    statusLabel: "Waitlisted",
    status: "waitlisted",
    dateTimeLabel: "Wednesday, October 9 · 6:00 PM · position 2 on the waitlist · no pass yet",
    addressLine: null,
    passHref: null,
    hoursUntilArrival: null,
    freeCancellationDeadlineLabel: null,
    lateArrivalWindowLabel: null,
  },
];

export type PastBookingOutcome = "completed" | "no-show" | "cancelled";

export interface PastBooking {
  reference: string;
  loungeName: string;
  dateTimeLabel: string;
  outcome: PastBookingOutcome;
  /** El no-show explica qué pasó y qué cobró — `NoShow.dc.html` / `History.dc.html`. */
  explanation?: string;
}

export const PAST_BOOKINGS: PastBooking[] = [
  {
    reference: AINSWORTH_PASS.reference,
    loungeName: AINSWORTH_PASS.loungeName,
    dateTimeLabel: "Saturday, September 14 · checked in 3:34 PM",
    outcome: "completed",
  },
  {
    reference: "LP-838204",
    loungeName: "The Vestry",
    dateTimeLabel: "Saturday, August 30 · 11:00 AM · stayed 3h 12m",
    outcome: "completed",
  },
  {
    reference: "LP-822640",
    loungeName: "Bergdorf Lounge",
    dateTimeLabel: "Sunday, July 28 · 10:00 AM · never checked in",
    outcome: "no-show",
    explanation:
      "The booking window closed at 11:00 PM without a check-in. The visit still counted toward July, and the day pass was not refunded — that is the cancellation policy you accepted at booking. Cancelling more than 24 hours ahead always avoids this.",
  },
  {
    reference: "LP-810112",
    loungeName: "The Ainsworth",
    dateTimeLabel: "Monday, July 15 · 3:30 PM · cancelled 3 days ahead",
    outcome: "cancelled",
    explanation: "Cancelled more than 24 hours ahead — no fee, and the visit returned to that month's allowance.",
  },
];

/** "3 of 8" — rail de la pestaña Upcoming (`Main.dc.html`). */
export const VISITS_THIS_MONTH = { used: 3, included: 8 };

/** Rail "Your record" de la pestaña Past (`History.dc.html`). */
export const BOOKING_RECORD_SUMMARY = {
  totalVisits: 14,
  completed: 11,
  cancelledInTime: 2,
  noShows: 1,
  feesCharged: LATE_CANCELLATION_FEE_LABEL,
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
