import { describe, expect, it } from "vitest";

import {
  bookingHistoryStatusFrom,
  displayNameFromEmail,
  formatOpenedDateLabel,
  formatOpenedTimeLabel,
  mapAdminMemberRow,
  mapBookingRow,
  mapMessageRow,
  mapPaymentRow,
  mapSupportCaseRow,
  mapTicketDetailRow,
  totalPaidToDateCents,
  upcomingBookingFrom,
  type AdminBookingRow,
  type AdminMemberRow,
  type AdminPaymentRow,
  type SupportTicketMessageRow,
  type SupportTicketRow,
  type TicketDetailRow,
} from "@/lib/admin";

describe("displayNameFromEmail", () => {
  it("convierte el local-part con puntos en un nombre con mayúsculas", () => {
    expect(displayNameFromEmail("priya.raghunathan@ensoleil.co")).toBe("Priya Raghunathan");
  });

  it("funciona con un solo nombre", () => {
    expect(displayNameFromEmail("theo@ensoleil.co")).toBe("Theo");
  });
});

describe("formatOpenedDateLabel", () => {
  it('dice "Today" cuando la fecha es el mismo día UTC que ahora', () => {
    const now = new Date("2026-09-16T14:00:00Z");
    expect(formatOpenedDateLabel("2026-09-16T09:12:00Z", now)).toBe("Today");
  });

  it("muestra mes y día cuando no es hoy", () => {
    const now = new Date("2026-09-16T14:00:00Z");
    expect(formatOpenedDateLabel("2026-09-14T16:58:00Z", now)).toBe("Sep 14");
  });
});

describe("formatOpenedTimeLabel", () => {
  it("formatea la hora en formato de 12 horas", () => {
    expect(formatOpenedTimeLabel("2026-09-16T09:12:00Z")).toBe("9:12 AM");
  });
});

describe("mapSupportCaseRow", () => {
  const row: SupportTicketRow = {
    id: "ticket-uuid-1",
    case_number: "CS-4417",
    member_id: "member-uuid-1",
    member_name: "Camille Duforest",
    status: "new",
    subject: "No-show fee charged — LP-840388",
    note: "The Ainsworth reported this booking as a no-show.",
    assigned_admin_id: null,
    assigned_admin_name: null,
    created_at: "2026-09-16T09:12:00Z",
  };

  it("deriva las iniciales del miembro", () => {
    expect(mapSupportCaseRow(row).memberInitials).toBe("CD");
  });

  it("no tiene assignee cuando el ticket no está asignado", () => {
    expect(mapSupportCaseRow(row).assignee).toBeNull();
  });

  it("deriva el nombre del assignee de su email", () => {
    const assigned: SupportTicketRow = { ...row, assigned_admin_name: "priya.raghunathan@ensoleil.co" };
    expect(mapSupportCaseRow(assigned).assignee).toBe("Priya Raghunathan");
  });

  it("expone el uuid real y el número de caso por separado", () => {
    const mapped = mapSupportCaseRow(row);
    expect(mapped.ticketId).toBe("ticket-uuid-1");
    expect(mapped.id).toBe("CS-4417");
  });
});

describe("mapAdminMemberRow", () => {
  const row: AdminMemberRow = {
    id: "member-uuid-1",
    full_name: "Camille Duforest",
    email: "camille.duforest@example.com",
    phone: "+15556684172",
    membership_status: "active",
    deleted_at: null,
    member_since: "2025-03-03T00:00:00Z",
    open_cases_count: 1,
    last_visit_date: "2026-09-14",
    last_visit_lounge: "The Ainsworth",
    photo_url: null,
    membership_plan: "annual",
    membership_plan_status: "active",
  };

  it("muestra el plan real de `memberships`", () => {
    expect(mapAdminMemberRow(row).membershipLabel).toBe("Annual member");
    expect(mapAdminMemberRow({ ...row, membership_plan: "monthly" }).membershipLabel).toBe("Monthly member");
    expect(mapAdminMemberRow(row).status).toBe("active");
  });

  it('marca "Expired" cuando el plan venció', () => {
    const expired = { ...row, membership_status: "inactive" as const, membership_plan_status: "expired" as const };
    expect(mapAdminMemberRow(expired).membershipLabel).toBe("Expired");
  });

  it('marca "No plan" cuando el miembro nunca contrató uno', () => {
    const noPlan = { ...row, membership_status: "inactive" as const, membership_plan: null, membership_plan_status: null };
    expect(mapAdminMemberRow(noPlan).membershipLabel).toBe("No plan");
  });

  it('marca "Account deleted" cuando la cuenta tiene deleted_at, sin importar membership_status', () => {
    const deleted = { ...row, deleted_at: "2026-09-01T00:00:00Z" };
    expect(mapAdminMemberRow(deleted).membershipLabel).toBe("Account deleted");
    expect(mapAdminMemberRow(deleted).status).toBe("deleted");
  });

  it('dice "No visits yet" cuando el miembro no tiene reservas', () => {
    const noVisits = { ...row, last_visit_date: null, last_visit_lounge: null };
    expect(mapAdminMemberRow(noVisits).lastVisitLabel).toBe("No visits yet");
  });

  it("formatea el mes y año de alta", () => {
    expect(mapAdminMemberRow(row).memberSinceLabel).toBe("member since March 2025");
  });
});

describe("bookingHistoryStatusFrom", () => {
  it("prioriza cancelled sobre cualquier otro campo", () => {
    expect(bookingHistoryStatusFrom({ status: "cancelled", no_show: true })).toBe("cancelled");
  });

  it("distingue un no-show de una reserva completada", () => {
    expect(bookingHistoryStatusFrom({ status: "completed", no_show: true })).toBe("no-show");
    expect(bookingHistoryStatusFrom({ status: "completed", no_show: false })).toBe("completed");
  });

  it("trata confirmed y waitlisted como próximas (confirmed)", () => {
    expect(bookingHistoryStatusFrom({ status: "confirmed", no_show: false })).toBe("confirmed");
    expect(bookingHistoryStatusFrom({ status: "waitlisted", no_show: false })).toBe("confirmed");
  });
});

describe("mapBookingRow", () => {
  const row: AdminBookingRow = {
    id: "booking-uuid-1",
    confirmation_code: "LP-840388",
    lounge_id: "the-ainsworth",
    lounge_name: "The Ainsworth",
    lounge_area: "Midtown East",
    date: "2026-09-14",
    band: "morning",
    slot_time: "10:30 AM",
    status: "completed",
    no_show: true,
    checked_in_at: null,
    cancelled_at: null,
    cancellation_fee_cents: 3500,
    created_at: "2026-09-10T12:00:00Z",
  };

  it("muestra la tarifa cobrada en un no-show", () => {
    expect(mapBookingRow(row).charged).toBe("$35.00 fee");
    expect(mapBookingRow(row).status).toBe("no-show");
  });

  it('dice "No charge" para una reserva cancelada sin tarifa', () => {
    const cancelled: AdminBookingRow = { ...row, status: "cancelled", no_show: false, cancellation_fee_cents: null };
    expect(mapBookingRow(cancelled).charged).toBe("No charge");
  });

  it('dice "Included" para una visita cubierta por la membresía', () => {
    const completed: AdminBookingRow = { ...row, no_show: false, cancellation_fee_cents: null };
    expect(mapBookingRow(completed).charged).toBe("Included");
  });
});

describe("upcomingBookingFrom", () => {
  const bookings = [
    mapBookingRow({
      id: "b1",
      confirmation_code: "LP-1",
      lounge_id: "l1",
      lounge_name: "Lounge One",
      lounge_area: "Area",
      date: "2026-09-10",
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
      no_show: false,
      checked_in_at: null,
      cancelled_at: null,
      cancellation_fee_cents: null,
      created_at: "2026-09-01T00:00:00Z",
    }),
    mapBookingRow({
      id: "b2",
      confirmation_code: "LP-2",
      lounge_id: "l2",
      lounge_name: "Lounge Two",
      lounge_area: "Area",
      date: "2026-09-20",
      band: "morning",
      slot_time: "8:00 AM",
      status: "confirmed",
      no_show: false,
      checked_in_at: null,
      cancelled_at: null,
      cancellation_fee_cents: null,
      created_at: "2026-09-01T00:00:00Z",
    }),
  ];

  it("elige la próxima reserva confirmada, no una ya pasada", () => {
    expect(upcomingBookingFrom(bookings, "2026-09-15")?.bookingId).toBe("b2");
  });

  it("devuelve null cuando no hay ninguna reserva confirmada futura", () => {
    expect(upcomingBookingFrom(bookings, "2026-09-25")).toBeNull();
  });
});

describe("mapPaymentRow", () => {
  it("marca un cargo succeeded como reembolsable", () => {
    const row: AdminPaymentRow = {
      kind: "payment",
      id: "payment-1",
      booking_id: "booking-1",
      title: "The Ainsworth · Aug 11",
      detail: "pi_123",
      amount_cents: 8166,
      status: "succeeded",
      stripe_payment_intent_id: "pi_123",
      created_at: "2026-08-11T00:00:00Z",
    };
    const mapped = mapPaymentRow(row);
    expect(mapped.refundable).toBe(true);
    expect(mapped.waivable).toBe(false);
    expect(mapped.amount).toBe("$81.66");
  });

  it("marca una tarifa registrada como waivable, nunca reembolsable", () => {
    const row: AdminPaymentRow = {
      kind: "fee",
      id: "booking-1",
      booking_id: "booking-1",
      title: "No-show fee · The Ainsworth",
      detail: "Sep 14",
      amount_cents: 3500,
      status: "recorded",
      stripe_payment_intent_id: null,
      created_at: "2026-09-14T00:00:00Z",
    };
    const mapped = mapPaymentRow(row);
    expect(mapped.waivable).toBe(true);
    expect(mapped.refundable).toBe(false);
  });

  it("no marca un cargo pendiente o fallido como reembolsable", () => {
    const row: AdminPaymentRow = {
      kind: "payment",
      id: "payment-2",
      booking_id: null,
      title: "Day pass",
      detail: "",
      amount_cents: 8166,
      status: "failed",
      stripe_payment_intent_id: "pi_456",
      created_at: "2026-08-11T00:00:00Z",
    };
    expect(mapPaymentRow(row).refundable).toBe(false);
  });
});

describe("totalPaidToDateCents", () => {
  it("suma solo los cargos reales succeeded, nunca las tarifas registradas", () => {
    const rows: AdminPaymentRow[] = [
      {
        kind: "payment",
        id: "p1",
        booking_id: "b1",
        title: "",
        detail: "",
        amount_cents: 240000,
        status: "succeeded",
        stripe_payment_intent_id: "pi_1",
        created_at: "2026-03-03T00:00:00Z",
      },
      {
        kind: "fee",
        id: "b2",
        booking_id: "b2",
        title: "",
        detail: "",
        amount_cents: 3500,
        status: "recorded",
        stripe_payment_intent_id: null,
        created_at: "2026-09-14T00:00:00Z",
      },
    ];
    expect(totalPaidToDateCents(rows.map(mapPaymentRow))).toBe(240000);
  });
});

describe("mapTicketDetailRow", () => {
  const base: TicketDetailRow = {
    id: "ticket-1",
    case_number: "CS-4417",
    member_id: "member-1",
    member_name: "Camille Duforest",
    member_email: "camille.duforest@example.com",
    status: "new",
    subject: "No-show fee charged — LP-840388",
    note: "note",
    assigned_admin_id: null,
    assigned_admin_name: null,
    resolution_reason: null,
    resolution_note: "",
    created_at: "2026-09-16T09:12:00Z",
    resolved_at: null,
    booking_id: "booking-1",
    booking_confirmation_code: "LP-840388",
    booking_fee_cents: 3500,
    payment_id: null,
    payment_amount_cents: null,
    payment_status: null,
    payment_intent_id: null,
  };

  it("expone una tarifa registrada como waivableFee, no como refundablePayment", () => {
    const mapped = mapTicketDetailRow(base);
    expect(mapped.waivableFee).toEqual({ bookingId: "booking-1", amountCents: 3500 });
    expect(mapped.refundablePayment).toBeUndefined();
  });

  it("expone un cargo real succeeded como refundablePayment", () => {
    const withPayment: TicketDetailRow = {
      ...base,
      booking_fee_cents: null,
      payment_id: "payment-1",
      payment_amount_cents: 8166,
      payment_status: "succeeded",
      payment_intent_id: "pi_123",
    };
    const mapped = mapTicketDetailRow(withPayment);
    expect(mapped.refundablePayment).toEqual({ paymentId: "payment-1", amountCents: 8166 });
    expect(mapped.waivableFee).toBeUndefined();
  });

  it("no expone ningún reembolso cuando no hay tarifa ni pago succeeded", () => {
    const clean: TicketDetailRow = { ...base, booking_fee_cents: null };
    const mapped = mapTicketDetailRow(clean);
    expect(mapped.waivableFee).toBeUndefined();
    expect(mapped.refundablePayment).toBeUndefined();
  });
});

describe("mapMessageRow", () => {
  it("combina la fecha y hora en un solo timestampLabel", () => {
    const row: SupportTicketMessageRow = {
      id: "msg-1",
      ticket_id: "ticket-1",
      kind: "internal-note",
      author: "Priya Raghunathan",
      body: "Checked with the partner.",
      created_at: "2026-09-16T09:40:00Z",
    };
    const now = new Date("2026-09-16T14:00:00Z");
    expect(mapMessageRow(row, now).timestampLabel).toBe("Today · 9:40 AM");
  });

  it("muestra la fecha completa cuando el mensaje no es de hoy", () => {
    const row: SupportTicketMessageRow = {
      id: "msg-2",
      ticket_id: "ticket-1",
      kind: "system",
      author: "System",
      body: "No-show reported.",
      created_at: "2026-09-14T16:02:00Z",
    };
    const now = new Date("2026-09-16T14:00:00Z");
    expect(mapMessageRow(row, now).timestampLabel).toBe("Sep 14 · 4:02 PM");
  });
});
