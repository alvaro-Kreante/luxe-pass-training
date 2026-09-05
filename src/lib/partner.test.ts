import { describe, expect, it } from "vitest";

import {
  ANALYTICS_SUMMARY,
  ARRIVALS_BY_WEEKDAY,
  CANCELLED_GUEST_ID,
  GUESTS_WHO_ARRIVED,
  LIVE_BOOKING,
  PARTNER_GUESTS,
  REPEAT_GUESTS,
  REVENUE_BREAKDOWN,
  TOTAL_REVENUE_ATTRIBUTED,
  WAITLIST_PROMOTED_GUEST,
  MONTHLY_BOOKINGS_BY_DAY,
  applyCancellationAndPromotion,
  applyLiveBooking,
  bookingsForRange,
  filterRepeatGuests,
  formatCurrency,
  guestCounts,
  guestListToCsv,
  loyaltyTier,
  markArrived,
  matchesGuestQuery,
  reportNoShow,
  repeatGuestsToCsv,
  revenueBreakdownToCsv,
} from "./partner";

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

describe("markArrived / reportNoShow", () => {
  it("marca un invitado pendiente como llegado sin tocar a los demás", () => {
    const updated = markArrived(PARTNER_GUESTS, "LP-842407");
    const idris = updated.find((g) => g.id === "LP-842407");

    expect(idris?.status).toBe("arrived");
    expect(updated.find((g) => g.id === "LP-842612")?.status).toBe("pending");
  });

  it("reporta un no-show para el invitado indicado, con su motivo", () => {
    const updated = reportNoShow(PARTNER_GUESTS, "LP-842407", "never-arrived");
    const guest = updated.find((g) => g.id === "LP-842407");

    expect(guest?.status).toBe("no-show");
    expect(guest?.noShowReason).toBe("never-arrived");
  });
});

describe("applyLiveBooking", () => {
  it("añade la reserva en vivo y sube el total esperado de 14 a 15", () => {
    const before = guestCounts(PARTNER_GUESTS);
    const after = guestCounts(applyLiveBooking(PARTNER_GUESTS));

    expect(before.expected).toBe(14);
    expect(after.expected).toBe(15);
    expect(after.pending).toBe(before.pending + 1);
  });
});

describe("applyCancellationAndPromotion", () => {
  it("cancela el hueco y promociona a la waitlist sin cambiar el total esperado", () => {
    const withLiveBooking = applyLiveBooking(PARTNER_GUESTS);
    const before = guestCounts(withLiveBooking);
    const after = applyCancellationAndPromotion(withLiveBooking);

    expect(after.find((g) => g.id === CANCELLED_GUEST_ID)?.status).toBe("cancelled");
    expect(after.some((g) => g.id === WAITLIST_PROMOTED_GUEST.id)).toBe(true);
    expect(guestCounts(after).expected).toBe(before.expected);
  });
});

describe("Story 7.3 — cifras de Analytics cuadran entre sí", () => {
  it("la distribución semanal suma el total de bookings del mes", () => {
    const total = ARRIVALS_BY_WEEKDAY.reduce((sum, d) => sum + d.guests, 0);
    expect(total).toBe(ANALYTICS_SUMMARY.bookings);
  });

  it("day passes + visitas de membresía cuadran con los invitados que llegaron", () => {
    expect(ANALYTICS_SUMMARY.dayPassVisits + ANALYTICS_SUMMARY.membershipVisits).toBe(
      GUESTS_WHO_ARRIVED,
    );
  });

  it("el desglose de ingresos suma el total atribuido", () => {
    const sum = REVENUE_BREAKDOWN.dayPasses + REVENUE_BREAKDOWN.membershipVisits + REVENUE_BREAKDOWN.noShowFees;
    expect(sum).toBeCloseTo(TOTAL_REVENUE_ATTRIBUTED);
    expect(formatCurrency(TOTAL_REVENUE_ATTRIBUTED)).toBe("$8,616.50");
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
    const filtered = filterRepeatGuests(REPEAT_GUESTS, "came-back");
    expect(filtered.every((g) => g.visits >= 2)).toBe(true);
    expect(filtered.some((g) => g.name === "Elena Vasquez")).toBe(false);
  });

  it('"first-visit" solo deja a quien tiene una visita', () => {
    const filtered = filterRepeatGuests(REPEAT_GUESTS, "first-visit");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Elena Vasquez");
  });
});

describe("bookingsForRange", () => {
  it('"week" son los últimos 7 días de los 14 del mes', () => {
    expect(bookingsForRange("week")).toEqual(MONTHLY_BOOKINGS_BY_DAY.slice(-7));
    expect(bookingsForRange("week")).toHaveLength(7);
  });

  it('"month" son los 14 días completos', () => {
    expect(bookingsForRange("month")).toEqual(MONTHLY_BOOKINGS_BY_DAY);
  });
});

describe("revenueBreakdownToCsv", () => {
  it("incluye las tres partidas y el total", () => {
    const csv = revenueBreakdownToCsv();

    expect(csv).toContain("Day passes");
    expect(csv).toContain("$3,975.00");
    expect(csv).toContain("Membership visits");
    expect(csv).toContain("$4,484.00");
    expect(csv).toContain("Shared no-show fees");
    expect(csv).toContain("$157.50");
    expect(csv).toContain("$8,616.50");
  });
});

describe("repeatGuestsToCsv", () => {
  it("incluye la cabecera y el nivel de lealtad calculado", () => {
    const csv = repeatGuestsToCsv(REPEAT_GUESTS.slice(0, 1));
    const [header, row] = csv.split("\n");

    expect(header).toBe("Guest name,Email,Visits here,Last visit,First visit,Loyalty,Attributed");
    expect(row).toContain("Regular");
    expect(row).toContain("$456.00");
  });
});
