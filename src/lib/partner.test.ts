import { describe, expect, it } from "vitest";

import {
  LIVE_BOOKING,
  PARTNER_GUESTS,
  type RepeatGuestRow,
  bookedAgoLabel,
  bookingsByWeekday,
  bookingsForRange,
  filterRepeatGuests,
  formatCurrency,
  guestCounts,
  guestListToCsv,
  loyaltyTier,
  mapGuestRow,
  mapRepeatGuestRow,
  matchesGuestQuery,
  repeatGuestsSummary,
  repeatGuestsToCsv,
  guestVisitStatus,
  revenueBreakdownFor,
  revenueBreakdownToCsv,
  totalRevenueAttributed,
} from "./partner";

const SAMPLE_REPEAT_GUESTS: RepeatGuestRow[] = [
  { memberId: "m-1", name: "Alexandra Rivas", email: "alexandra.rivas@example.com", visits: 12, lastVisitLabel: "Sep 9, 2025", firstVisitLabel: "Mar 1, 2024", attributed: 456 },
  { memberId: "m-2", name: "Elena Vasquez", email: "elena.vasquez@example.com", visits: 1, lastVisitLabel: "Sep 9, 2025", firstVisitLabel: "Sep 9, 2025", attributed: 75 },
];

/**
 * Story 7.1 — Daily Guest Management. Los criterios que cubren estas
 * funciones están en
 * docs/specs/epic-7-partner-dashboard/story-7.1-daily-guest-management.md
 */

describe("guestCounts", () => {
  it("cuadra con los 14 esperados de Main.dc.html antes de la reserva en vivo", () => {
    const counts = guestCounts(PARTNER_GUESTS);

    expect(counts.expected).toBe(14);
    expect(counts.arrived).toBe(10);
    expect(counts.pending).toBe(3);
    expect(counts.noShow).toBe(1);
  });

  it("cuadra con los 15 esperados de LiveUpdate.dc.html tras la reserva en vivo", () => {
    const counts = guestCounts([...PARTNER_GUESTS, LIVE_BOOKING]);

    expect(counts.expected).toBe(15);
    expect(counts.pending).toBe(4);
    expect(counts.arrived).toBe(10);
    expect(counts.noShow).toBe(1);
  });
});

describe("matchesGuestQuery", () => {
  const guest = PARTNER_GUESTS.find((g) => g.id === "LP-840107")!;

  it("coincide por nombre, sin distinguir mayúsculas", () => {
    expect(matchesGuestQuery(guest, "lindqvist")).toBe(true);
  });

  it("coincide por número LP", () => {
    expect(matchesGuestQuery(guest, "lp-840107")).toBe(true);
  });

  it("no coincide con un nombre distinto", () => {
    expect(matchesGuestQuery(guest, "camille")).toBe(false);
  });

  it("una búsqueda vacía coincide con todos", () => {
    expect(matchesGuestQuery(guest, "")).toBe(true);
  });
});

describe("guestListToCsv", () => {
  it("incluye la cabecera y una fila por invitado", () => {
    const csv = guestListToCsv(PARTNER_GUESTS.slice(0, 2));
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "Guest name,Arrival time and check-in time,LP reference,Attendance status,Email and phone",
    );
    expect(lines[1]).toContain("Marcus Ellery");
    expect(lines[1]).toContain("LP-839014");
  });

  it("sigue la selección de columnas", () => {
    const csv = guestListToCsv(PARTNER_GUESTS.slice(0, 1), ["name", "reference"]);
    const [header, row] = csv.split("\n");

    expect(header).toBe("Guest name,LP reference");
    expect(row).toBe('"Marcus Ellery","LP-839014"');
  });
});

describe("mapGuestRow — backend real (partner_guest_list → PartnerGuest)", () => {
  const baseRow = {
    id: "11111111-1111-1111-1111-111111111111",
    confirmation_code: "LP-999001",
    member_name: "Theo Lindqvist",
    member_email: "theo.lindqvist@example.com",
    member_phone: "+1 (555) 214-9930",
    band: "morning",
    slot_time: "10:00 AM",
    status: "confirmed",
    checked_in_at: null,
    no_show: false,
    no_show_reason: null,
    special_requests: "",
    created_at: new Date().toISOString(),
    is_day_pass: false,
    visit_number: 3,
    emergency_contact: null,
  };

  it("usa el LP# como id de UI y guarda el uuid real como bookingId", () => {
    const guest = mapGuestRow(baseRow);

    expect(guest.id).toBe("LP-999001");
    expect(guest.bookingId).toBe(baseRow.id);
  });

  it("deriva iniciales y el ordinal de la visita", () => {
    const guest = mapGuestRow(baseRow);

    expect(guest.initials).toBe("TL");
    expect(guest.visitLabel).toBe("3rd visit here");
  });

  it("etiqueta day pass vs. membresía según is_day_pass", () => {
    expect(mapGuestRow(baseRow).membershipLabel).toBe("Annual member");
    expect(mapGuestRow({ ...baseRow, is_day_pass: true }).membershipLabel).toBe("Day pass");
  });

  it("mapea el estado de la reserva al status de PartnerGuest", () => {
    expect(mapGuestRow({ ...baseRow, status: "confirmed" }).status).toBe("pending");
    expect(mapGuestRow({ ...baseRow, status: "in_progress" }).status).toBe("arrived");
    expect(mapGuestRow({ ...baseRow, status: "completed", no_show: true }).status).toBe("no-show");
    expect(mapGuestRow({ ...baseRow, status: "cancelled" }).status).toBe("cancelled");
  });

  it("marca 'new-booking' solo cuando newlyBooked está activo y sigue pendiente", () => {
    expect(mapGuestRow(baseRow, { newlyBooked: true }).status).toBe("new-booking");
    expect(
      mapGuestRow({ ...baseRow, status: "in_progress" }, { newlyBooked: true }).status,
    ).toBe("arrived");
  });

  it("vacía el contacto cuando la RPC ya lo ocultó (reserva cancelada)", () => {
    const guest = mapGuestRow({ ...baseRow, status: "cancelled", member_email: null, member_phone: null });

    expect(guest.email).toBe("");
    expect(guest.phone).toBe("");
  });
});

describe("bookedAgoLabel", () => {
  it("dice 'just now' para algo recién creado", () => {
    const now = new Date("2025-09-09T15:00:00Z");
    expect(bookedAgoLabel(new Date("2025-09-09T14:59:30Z").toISOString(), now)).toBe("Booked just now");
  });

  it("cuenta en horas dentro del mismo día", () => {
    const now = new Date("2025-09-09T15:00:00Z");
    expect(bookedAgoLabel(new Date("2025-09-09T12:00:00Z").toISOString(), now)).toBe("Booked 3 hours ago");
  });

  it("cuenta en días más allá de 24 horas", () => {
    const now = new Date("2025-09-09T15:00:00Z");
    expect(bookedAgoLabel(new Date("2025-09-05T15:00:00Z").toISOString(), now)).toBe("Booked 4 days ago");
  });
});

describe("Story 7.3 — revenueBreakdownFor / totalRevenueAttributed (backend real)", () => {
  const summary = {
    bookings: 187,
    day_pass_visits: 53,
    membership_visits: 118,
    no_shows: 9,
    cancellations: 7,
    day_pass_revenue_cents: 432798,
    no_show_fee_cents: 31500,
  };

  it("usa lo cobrado de verdad, no una tarifa por visita", () => {
    const breakdown = revenueBreakdownFor(summary);

    expect(breakdown.dayPasses).toBe(4327.98);
    expect(breakdown.membershipVisits).toBe(0);
    expect(breakdown.noShowFees).toBe(315);
  });

  it("el total es la suma de las tres partidas", () => {
    const breakdown = revenueBreakdownFor(summary);
    expect(formatCurrency(totalRevenueAttributed(breakdown))).toBe("$4,642.98");
  });
});

describe("bookingsByWeekday", () => {
  it("suma una serie diaria por día de la semana, lunes primero", () => {
    const days = [
      { day: "2025-09-08", bookings: 5 }, // Monday
      { day: "2025-09-09", bookings: 3 }, // Tuesday
      { day: "2025-09-15", bookings: 2 }, // Monday (semana siguiente)
    ];

    const result = bookingsByWeekday(days);

    expect(result[0]).toEqual({ day: "Mon", guests: 7 });
    expect(result[1]).toEqual({ day: "Tue", guests: 3 });
    expect(result.map((r) => r.day)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});

describe("loyaltyTier", () => {
  it("Regular a partir de 5 visitas", () => {
    expect(loyaltyTier(5)).toBe("regular");
    expect(loyaltyTier(12)).toBe("regular");
  });

  it("Returning entre 2 y 4 visitas", () => {
    expect(loyaltyTier(2)).toBe("returning");
    expect(loyaltyTier(4)).toBe("returning");
  });

  it("First visit con una sola visita", () => {
    expect(loyaltyTier(1)).toBe("first-visit");
  });
});

describe("filterRepeatGuests", () => {
  it('"came-back" excluye a quien solo tiene una visita', () => {
    const filtered = filterRepeatGuests(SAMPLE_REPEAT_GUESTS, "came-back");
    expect(filtered.every((g) => g.visits >= 2)).toBe(true);
    expect(filtered.some((g) => g.name === "Elena Vasquez")).toBe(false);
  });

  it('"first-visit" solo deja a quien tiene una visita', () => {
    const filtered = filterRepeatGuests(SAMPLE_REPEAT_GUESTS, "first-visit");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Elena Vasquez");
  });
});

describe("bookingsForRange", () => {
  const series = [9, 8, 10, 12, 14, 18, 21, 10, 9, 11, 12, 14, 23, 15];

  it('"week" son los últimos 7 días de la serie', () => {
    expect(bookingsForRange(series, "week")).toEqual(series.slice(-7));
    expect(bookingsForRange(series, "week")).toHaveLength(7);
  });

  it('"month" es la serie completa', () => {
    expect(bookingsForRange(series, "month")).toEqual(series);
  });
});

describe("revenueBreakdownToCsv", () => {
  it("incluye las tres partidas con lo cobrado y el total", () => {
    const csv = revenueBreakdownToCsv({
      bookings: 187,
      day_pass_visits: 53,
      membership_visits: 118,
      no_shows: 9,
      cancellations: 7,
      day_pass_revenue_cents: 432798,
      no_show_fee_cents: 31500,
    });

    expect(csv).toContain("Day passes");
    expect(csv).toContain("$4,327.98");
    expect(csv).toContain("Membership visits");
    expect(csv).toContain("$0.00");
    expect(csv).toContain("No-show fees");
    expect(csv).toContain("$315.00");
    expect(csv).toContain("$4,642.98");
  });
});

describe("repeatGuestsToCsv", () => {
  it("incluye la cabecera y el nivel de lealtad calculado", () => {
    const csv = repeatGuestsToCsv(SAMPLE_REPEAT_GUESTS.slice(0, 1));
    const [header, row] = csv.split("\n");

    expect(header).toBe("Guest name,Email,Visits here,Last visit,First visit,Loyalty,Attributed");
    expect(row).toContain("Regular");
    expect(row).toContain("$456.00");
  });
});

describe("mapRepeatGuestRow — backend real (partner_repeat_guests → RepeatGuestRow)", () => {
  it("formatea las fechas y traslada nombre/email/visitas/atribuido", () => {
    const guest = mapRepeatGuestRow({
      member_id: "22222222-2222-2222-2222-222222222222",
      member_name: "Alexandra Rivas",
      member_email: "alexandra.rivas@example.com",
      visits: 12,
      first_visit: "2024-03-01",
      last_visit: "2025-09-09",
      attributed: 456,
    });

    expect(guest.name).toBe("Alexandra Rivas");
    expect(guest.lastVisitLabel).toBe("Sep 9, 2025");
    expect(guest.firstVisitLabel).toBe("Mar 1, 2024");
    expect(guest.attributed).toBe(456);
  });
});

describe("repeatGuestsSummary", () => {
  it("cuenta miembros totales, los que repitieron y la tasa de retorno", () => {
    const summary = repeatGuestsSummary(SAMPLE_REPEAT_GUESTS);

    expect(summary.totalMembers).toBe(2);
    expect(summary.cameBackAtLeastOnce).toBe(1);
    expect(summary.returnRate).toBe(50);
    expect(summary.averageVisits).toBe(6.5);
  });

  it("no divide por cero con una lista vacía", () => {
    expect(repeatGuestsSummary([])).toEqual({
      totalMembers: 0,
      cameBackAtLeastOnce: 0,
      returnRate: 0,
      averageVisits: 0,
    });
  });
});

describe("guestVisitStatus — estado de cada reserva en la ficha del invitado", () => {
  const base = { booking_id: "b", lounge_name: "L", slot_time: "8:00 AM", status: "confirmed", checked_in: false, no_show: false, paid_cents: 0 };

  it("distingue arrived, no-show y cancelled", () => {
    expect(guestVisitStatus({ ...base, date: "2026-10-01", checked_in: true, status: "in_progress" }, "2026-10-21")).toBe("arrived");
    expect(guestVisitStatus({ ...base, date: "2026-10-01", no_show: true, status: "completed" }, "2026-10-21")).toBe("no-show");
    expect(guestVisitStatus({ ...base, date: "2026-10-01", status: "cancelled" }, "2026-10-21")).toBe("cancelled");
  });

  it("una reserva sin check-in está por venir hasta que pasa su fecha", () => {
    expect(guestVisitStatus({ ...base, date: "2026-10-21" }, "2026-10-21")).toBe("upcoming");
    expect(guestVisitStatus({ ...base, date: "2026-10-20" }, "2026-10-21")).toBe("not-checked-in");
  });
});
