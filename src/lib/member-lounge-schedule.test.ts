import { describe, expect, it } from "vitest";

import { formatDateRange, memberSchedule, weekHoursFrom, type LoungeSchedule } from "./lounge-schedule";

/**
 * Story 10.9 (criterios 2 y 5) — lo que el miembro lee de las temporadas y
 * cierres en la ficha (SeasonalHours / NoSchedule / ClosedToday.dc.html).
 */

/** Domingo primero. */
const USUAL = [
  "10:00 AM – 9:00 PM",
  "8:00 AM – 11:00 PM",
  "8:00 AM – 11:00 PM",
  "8:00 AM – 11:00 PM",
  "8:00 AM – 11:00 PM",
  "8:00 AM – 1:00 AM",
  "10:00 AM – 1:00 AM",
];
const LATE_SUMMER = [
  "10:00 AM – 8:00 PM",
  "8:00 AM – 10:00 PM",
  "8:00 AM – 10:00 PM",
  "8:00 AM – 10:00 PM",
  "8:00 AM – 10:00 PM",
  "8:00 AM – 12:00 AM",
  "10:00 AM – 12:00 AM",
];

const schedule: LoungeSchedule = {
  seasons: [
    { id: "past", name: "Spring", startsOn: "2025-03-01", endsOn: "2025-05-31", weeklyHours: USUAL },
    { id: "now", name: "Late summer hours", startsOn: "2025-09-01", endsOn: "2025-09-30", weeklyHours: LATE_SUMMER },
    { id: "next", name: "", startsOn: "2025-12-20", endsOn: "2026-01-04", weeklyHours: USUAL },
  ],
  closures: [
    { id: "old", startsOn: "2025-08-01", endsOn: "2025-08-02", reason: "Renovation", reopensLabel: "Sun Aug 3 at 10:00 AM" },
    { id: "event", startsOn: "2025-09-12", endsOn: "2025-09-13", reason: "Private event", reopensLabel: "Sun Sep 14 at 10:00 AM" },
  ],
};

describe("memberSchedule", () => {
  it("solo muestra temporadas en curso o futuras, marcando la que está en curso", () => {
    const { seasons, inEffect } = memberSchedule(schedule, "2025-09-09");

    expect(seasons.map((s) => [s.id, s.inEffect])).toEqual([
      ["now", true],
      ["next", false],
    ]);
    expect(inEffect?.id).toBe("now");
  });

  it("solo muestra cierres que todavía no han terminado", () => {
    const { closures, closedToday } = memberSchedule(schedule, "2025-09-09");

    expect(closures.map((c) => c.id)).toEqual(["event"]);
    expect(closedToday).toBeNull();
  });

  it("separa el cierre que cubre hoy de los próximos", () => {
    const { closures, closedToday } = memberSchedule(schedule, "2025-09-12");

    expect(closedToday?.id).toBe("event");
    expect(closures).toEqual([]);
  });

  it("sin temporadas ni cierres no hay nada que mostrar", () => {
    const result = memberSchedule({ seasons: [], closures: [] }, "2025-09-09");

    expect(result).toEqual({ seasons: [], closures: [], inEffect: null, closedToday: null });
  });
});

describe("weekHoursFrom", () => {
  it("durante una temporada usa su horario en vez del habitual", () => {
    const [todayRow] = weekHoursFrom("2025-09-09", USUAL, schedule);

    expect(todayRow).toEqual({ label: "Tuesday · Today", hours: "8:00 AM – 10:00 PM", isToday: true });
  });

  it("los días de un cierre especial salen cerrados con su motivo", () => {
    const rows = weekHoursFrom("2025-09-12", USUAL, schedule);

    expect(rows[0]).toEqual({ label: "Friday · Today", hours: "Closed · Private event", isToday: true });
    expect(rows[1]).toEqual({ label: "Saturday", hours: "Closed · Private event" });
  });

  it("vuelve al horario habitual los días que caen fuera de la temporada", () => {
    const rows = weekHoursFrom("2025-09-28", USUAL, schedule);

    expect(rows.at(-1)).toEqual({ label: "Saturday", hours: "10:00 AM – 1:00 AM" });
  });
});

describe("formatDateRange", () => {
  it("en el mismo año pone el año una vez", () => {
    expect(formatDateRange("2025-09-01", "2025-09-30")).toBe("Sep 1 – Sep 30, 2025");
  });

  it("entre dos años pone los dos", () => {
    expect(formatDateRange("2025-12-20", "2026-01-04")).toBe("Dec 20, 2025 – Jan 4, 2026");
  });
});
