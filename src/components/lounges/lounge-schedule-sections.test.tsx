import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AvailabilityCard } from "@/components/lounges/availability-card";
import { LoungeScheduleSections } from "@/components/lounges/lounge-schedule-sections";
import { OperatingHours } from "@/components/lounges/operating-hours";
import type { LoungeClosure, LoungeSeason } from "@/lib/lounge-schedule";

/** Story 10.9 (criterios 2 y 5) — temporadas y cierres en la ficha del miembro. */

const WEEK = Array(7).fill("8:00 AM – 10:00 PM");
const lateSummer: LoungeSeason = { id: "1", name: "Late summer hours", startsOn: "2025-09-01", endsOn: "2025-09-30", weeklyHours: WEEK };
const unnamed: LoungeSeason = { id: "2", name: "", startsOn: "2025-12-20", endsOn: "2026-01-04", weeklyHours: WEEK };
const privateEvent: LoungeClosure = {
  id: "3",
  startsOn: "2025-09-12",
  endsOn: "2025-09-13",
  reason: "Private event",
  reopensLabel: "Sun Sep 14 at 10:00 AM",
};

describe("secciones de temporadas y cierres", () => {
  it("lista cada temporada con sus fechas y si está en curso o viene después", () => {
    render(
      <LoungeScheduleSections
        seasons={[
          { ...lateSummer, inEffect: true },
          { ...unnamed, inEffect: false },
        ]}
        closures={[]}
      />,
    );

    const section = screen.getByRole("region", { name: "Seasonal hours" });
    const [current, next] = within(section).getAllByRole("listitem");
    expect(within(current).getByText("Late summer hours")).toBeInTheDocument();
    expect(within(current).getByText("In effect")).toBeInTheDocument();
    expect(within(current).getByText("Sep 1 – Sep 30, 2025")).toBeInTheDocument();
    expect(within(next).getByText("Seasonal hours")).toBeInTheDocument();
    expect(within(next).getByText("Upcoming")).toBeInTheDocument();
  });

  it("muestra cada cierre próximo con el aviso de cierre", () => {
    render(<LoungeScheduleSections seasons={[]} closures={[privateEvent]} />);

    const section = screen.getByRole("region", { name: "Special closures" });
    expect(within(section).getByText(/Closed .* for Private event/)).toBeInTheDocument();
    expect(within(section).getByText(/reopens Sun Sep 14 at 10:00 AM/)).toBeInTheDocument();
  });

  it("sin temporadas ni cierres no muestra ninguna de las dos secciones", () => {
    render(<LoungeScheduleSections seasons={[]} closures={[]} />);

    expect(screen.queryByRole("region", { name: "Seasonal hours" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Special closures" })).not.toBeInTheDocument();
  });
});

describe("horario durante una temporada", () => {
  it("indica la temporada y cuándo vuelve el horario habitual", () => {
    render(<OperatingHours rows={[{ label: "Tuesday · Today", hours: "8:00 AM – 10:00 PM", isToday: true }]} season={lateSummer} />);

    expect(screen.getByText("Late summer hours")).toBeInTheDocument();
    expect(screen.getByText("Season hours until Sep 30 · usual hours from Oct 1")).toBeInTheDocument();
  });
});

describe("tarjeta de disponibilidad con cierre hoy", () => {
  it("dice que está cerrado hoy, por qué y cuándo reabre", () => {
    render(
      <AvailabilityCard
        loungeId="the-ainsworth"
        capacity={40}
        bookingRestrictions={[]}
        hoursToday={{ label: "Friday · Today", hours: "Closed · Private event", isToday: true }}
        available={false}
        todaySeatsLeft={0}
        lastUpdatedAt={new Date().toISOString()}
        closedToday={privateEvent}
      />,
    );

    expect(screen.getByRole("heading", { name: "Closed today" })).toBeInTheDocument();
    expect(screen.getByText("Private event · bookings reopen Sun Sep 14 at 10:00 AM.")).toBeInTheDocument();
  });
});
