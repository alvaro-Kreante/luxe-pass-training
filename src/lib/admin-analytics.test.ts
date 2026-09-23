import { describe, expect, it } from "vitest";

import {
  buildExportCsv,
  cadenceLabel,
  dateRangeForPeriod,
  dateRangeForPreset,
  formatDateRangeLabel,
  noShowRatePct,
  sharePct,
  totalGrossRevenueCents,
  type AdminExportBookingRow,
  type AdminExportMemberRow,
  type AdminExportNoShowRow,
  type RevenueByPartnerRow,
} from "@/lib/admin-analytics";

describe("dateRangeForPeriod", () => {
  it("cubre los últimos 14 días terminando en TODAY", () => {
    expect(dateRangeForPeriod("14d", "2025-09-14")).toEqual({ from: "2025-09-01", to: "2025-09-14" });
  });

  it("cubre 30 días para el período de mes", () => {
    expect(dateRangeForPeriod("month", "2025-09-14")).toEqual({ from: "2025-08-16", to: "2025-09-14" });
  });

  it("cubre 90 días para el período de trimestre", () => {
    expect(dateRangeForPeriod("quarter", "2025-09-14").from).toBe("2025-06-17");
  });
});

describe("dateRangeForPreset", () => {
  it("cubre exactamente N días terminando en TODAY", () => {
    expect(dateRangeForPreset(7, "2025-09-14")).toEqual({ from: "2025-09-08", to: "2025-09-14" });
  });
});

describe("formatDateRangeLabel", () => {
  it('formatea el rango como "Sep 1 – Sep 14"', () => {
    expect(formatDateRangeLabel({ from: "2025-09-01", to: "2025-09-14" })).toBe("Sep 1 – Sep 14");
  });
});

describe("noShowRatePct", () => {
  it("calcula el porcentaje con un decimal", () => {
    expect(noShowRatePct(62, 1208)).toBe(5.1);
  });

  it("devuelve 0 cuando no hay reservas, sin dividir por cero", () => {
    expect(noShowRatePct(0, 0)).toBe(0);
  });
});

describe("sharePct", () => {
  it("calcula el share con un decimal", () => {
    expect(sharePct(187, 1208)).toBe(15.5);
  });

  it("devuelve 0 cuando el total es cero", () => {
    expect(sharePct(0, 0)).toBe(0);
  });
});

describe("totalGrossRevenueCents", () => {
  it("suma los ingresos brutos de todos los lounges", () => {
    const rows: RevenueByPartnerRow[] = [
      { loungeId: "a", loungeName: "A", bookings: 3, grossRevenueCents: 1000 },
      { loungeId: "b", loungeName: "B", bookings: 1, grossRevenueCents: 500 },
    ];
    expect(totalGrossRevenueCents(rows)).toBe(1500);
  });
});

describe("cadenceLabel", () => {
  it("traduce cada cadencia a su etiqueta", () => {
    expect(cadenceLabel("daily")).toBe("Every day");
    expect(cadenceLabel("weekly")).toBe("Every week");
    expect(cadenceLabel("monthly")).toBe("Every month");
  });
});

describe("buildExportCsv", () => {
  it("solo incluye las columnas de bookings seleccionadas, en su orden", () => {
    const row: AdminExportBookingRow = {
      confirmation_code: "LP-1",
      member_id: "member-1",
      member_name: "Camille Duforest",
      member_email: "camille@example.com",
      member_phone: "+15551234567",
      lounge_name: "The Ainsworth",
      city: "New York",
      date: "2025-09-09",
      slot_time: "8:00 AM",
      status: "completed",
      amount_charged_cents: 8166,
      payment_method: "Stripe",
    };
    const csv = buildExportCsv("bookings", ["reference", "lounge", "amount"], [row]);
    expect(csv).toBe('"Booking reference","Lounge","Amount charged"\n"LP-1","The Ainsworth","$81.66"');
  });

  it("nunca filtra un nombre/email/teléfono si esas columnas no están seleccionadas", () => {
    const row: AdminExportBookingRow = {
      confirmation_code: "LP-1",
      member_id: "member-1",
      member_name: "Camille Duforest",
      member_email: "camille@example.com",
      member_phone: "+15551234567",
      lounge_name: "The Ainsworth",
      city: "New York",
      date: "2025-09-09",
      slot_time: "8:00 AM",
      status: "completed",
      amount_charged_cents: 8166,
      payment_method: "Stripe",
    };
    const csv = buildExportCsv("bookings", ["memberId"], [row]);
    expect(csv).not.toContain("Camille Duforest");
    expect(csv).not.toContain("camille@example.com");
    expect(csv).toContain("member-1");
  });

  it("arma el CSV de miembros marcando una cuenta borrada", () => {
    const row: AdminExportMemberRow = {
      member_id: "member-1",
      full_name: "Camille Duforest",
      email: "camille@example.com",
      phone: null,
      membership_status: "active",
      member_since: "2025-03-03T00:00:00Z",
      deleted_at: "2025-09-01T00:00:00Z",
    };
    const csv = buildExportCsv("members", ["memberName", "status"], [row]);
    expect(csv).toContain('"deleted"');
  });

  it("arma el CSV de no-shows/cancelaciones con la tarifa formateada", () => {
    const row: AdminExportNoShowRow = {
      confirmation_code: "LP-840388",
      member_name: "Camille Duforest",
      lounge_name: "The Ainsworth",
      date: "2025-09-14",
      status: "completed",
      no_show: true,
      fee_cents: 3500,
    };
    const csv = buildExportCsv("no-shows-cancellations", ["reference", "status", "fee"], [row]);
    expect(csv).toContain('"no-show"');
    expect(csv).toContain('"$35.00"');
  });
});
