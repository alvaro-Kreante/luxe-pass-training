import { describe, expect, it } from "vitest";

import { LOUNGES } from "./lounges";
import {
  BOOKING_RESTRICTIONS,
  WEEK_BANDS,
  closureCovering,
  closuresFor,
  contactFor,
  mentionsFor,
  mondayOf,
  operatingHoursFor,
  ratingBreakdownFor,
  reviewCountFor,
  reviewsFor,
  weeklyAvailability,
} from "./lounge-profile";

/**
 * Story 3.1 / 3.2 — datos derivados del catálogo de `lounges.ts`. Ningún
 * lounge del catálogo tiene estos campos de fábrica: esta capa los deriva
 * (o, para The Ainsworth, los fija tal como los cita el artboard) para que
 * el perfil funcione para cualquier lounge, no solo el que dibuja el mockup.
 */

describe("contacto del lounge", () => {
  it("da a The Ainsworth el contacto exacto del artboard Main.dc.html", () => {
    const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

    expect(contactFor(ainsworth)).toEqual({
      address: "122 E 45th St, New York, NY 10017",
      phone: "+1 (212) 555-0184",
      email: "reception@ainsworth.example",
      website: "ainsworth.example",
      receptionNote:
        "Reception is on Level 2. Show your booking confirmation on arrival.",
    });
  });

  it("genera contacto plausible para cualquier otro lounge del catálogo", () => {
    for (const lounge of LOUNGES) {
      const contact = contactFor(lounge);

      expect(contact.phone).toMatch(/^\+1 \(\d{3}\) 555-\d{4}$/);
      expect(contact.email).toContain("@");
      expect(contact.address).toContain(lounge.city);
    }
  });

  it("el contacto es estable entre llamadas para el mismo lounge", () => {
    const lounge = LOUNGES.find((l) => l.id === "belmont-terrace")!;

    expect(contactFor(lounge)).toEqual(contactFor(lounge));
  });
});

describe("horario de apertura", () => {
  it("marca el día de hoy en la primera fila", () => {
    const rows = operatingHoursFor();

    expect(rows[0].isToday).toBe(true);
    expect(rows[0].label).toContain("Today");
  });

  it("cubre los siete días de la semana sin repetir ninguno", () => {
    const rows = operatingHoursFor();
    const daysCovered = rows.reduce((total, row) => {
      const range = row.label.replace(" · Today", "");
      const [start, end] = range.split(" – ");
      if (!end) return total + 1;
      const names = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return total + (names.indexOf(end) - names.indexOf(start) + 1);
    }, 0);

    expect(daysCovered).toBe(7);
  });
});

describe("restricciones de reserva", () => {
  it("da al menos una restricción de tier y una de antelación", () => {
    expect(BOOKING_RESTRICTIONS.length).toBeGreaterThan(0);
  });
});

describe("reseñas", () => {
  it("The Ainsworth tiene el recuento y las reseñas del artboard Reviews.dc.html", () => {
    const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

    expect(reviewCountFor(ainsworth)).toBe(128);
    expect(reviewsFor(ainsworth)).toHaveLength(3);
    expect(ratingBreakdownFor(ainsworth).reduce((sum, row) => sum + row.count, 0)).toBe(
      128,
    );
  });

  it("Belmont Terrace no tiene reseñas todavía, como en NoRatings.dc.html", () => {
    const belmont = LOUNGES.find((lounge) => lounge.id === "belmont-terrace")!;

    expect(reviewCountFor(belmont)).toBe(0);
    expect(reviewsFor(belmont)).toHaveLength(0);
    expect(mentionsFor(belmont)).toHaveLength(0);
  });

  it("un lounge con reseñas siempre trae al menos una mención", () => {
    const withReviews = LOUNGES.find(
      (lounge) => lounge.id !== "belmont-terrace",
    )!;

    expect(mentionsFor(withReviews).length).toBeGreaterThan(0);
  });
});

describe("cierres por festivo", () => {
  it("The Ainsworth cierra Thanksgiving, como en Closure.dc.html", () => {
    const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

    expect(closuresFor(ainsworth)).toHaveLength(1);
    expect(closureCovering(ainsworth, "2025-11-27")).toBeDefined();
    expect(closureCovering(ainsworth, "2025-11-28")).toBeDefined();
    expect(closureCovering(ainsworth, "2025-11-29")).toBeUndefined();
  });

  it("un lounge sin cierre declarado no tiene ninguno", () => {
    const belmont = LOUNGES.find((lounge) => lounge.id === "belmont-terrace")!;

    expect(closuresFor(belmont)).toHaveLength(0);
    expect(closureCovering(belmont, "2025-11-27")).toBeUndefined();
  });
});

describe("calendario semanal de disponibilidad", () => {
  it("mondayOf devuelve el lunes de la semana de una fecha", () => {
    expect(mondayOf("2025-09-09")).toBe("2025-09-08");
    expect(mondayOf("2025-09-14")).toBe("2025-09-08");
  });

  it("genera 28 celdas — 4 franjas por cada uno de los 7 días", () => {
    const lounge = LOUNGES.find((l) => l.id === "the-ainsworth")!;
    const cells = weeklyAvailability(lounge, "2025-09-08");

    expect(cells).toHaveLength(7 * WEEK_BANDS.length);
  });

  it("cierra las franjas de los días marcados en closedWeekdays", () => {
    const lounge = LOUNGES.find((l) => l.id === "the-ainsworth")!;
    expect(lounge.closedWeekdays).toContain(0);

    const cells = weeklyAvailability(lounge, "2025-09-08");
    const sunday = cells.filter((cell) => cell.dateIso === "2025-09-14");

    expect(sunday.every((cell) => cell.status === "closed")).toBe(true);
  });

  it("cierra las franjas que caen dentro de un cierre por festivo", () => {
    const lounge = LOUNGES.find((l) => l.id === "the-ainsworth")!;
    const cells = weeklyAvailability(lounge, "2025-11-24");
    const closedDay = cells.filter((cell) => cell.dateIso === "2025-11-27");

    expect(closedDay.every((cell) => cell.status === "closed")).toBe(true);
    expect(closedDay[0].closureReason).toBe("Thanksgiving");
  });

  it("marca como pasadas las franjas de hoy anteriores a la franja actual", () => {
    const lounge = LOUNGES.find((l) => l.id === "the-ainsworth")!;
    const cells = weeklyAvailability(lounge, "2025-09-08");
    const morningToday = cells.find(
      (cell) => cell.dateIso === "2025-09-09" && cell.band === "morning",
    )!;

    expect(morningToday.status).toBe("past");
  });

  it("una franja fuera de closedWeekdays y sin cierre queda disponible o completa, nunca cerrada", () => {
    const lounge = LOUNGES.find((l) => l.id === "the-ainsworth")!;
    const cells = weeklyAvailability(lounge, "2025-09-15");

    expect(
      cells
        .filter((cell) => cell.dateIso !== "2025-09-21")
        .every((cell) => cell.status !== "closed"),
    ).toBe(true);
  });
});
