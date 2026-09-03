import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mondayOf, weeklyAvailability, WEEK_BANDS } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";

import AvailabilityPage from "./page";

/**
 * Story 3.2 — Availability.
 * Criterios en docs/specs/epic-3-lounge-profiles-details/story-3.2-availability.md
 * y el segmento "Story 3.2" de flow-complete-booking-journey.md.
 */

const params = vi.fn(() => ({ id: "the-ainsworth" }));
const searchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  useSearchParams: () => searchParams(),
  usePathname: () => "/lounges/the-ainsworth/availability",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
  searchParams.mockReturnValue(new URLSearchParams());
});

describe("calendario semanal", () => {
  it("muestra el nombre del lounge y la semana actual", () => {
    render(<AvailabilityPage />);

    expect(screen.getAllByText("The Ainsworth").length).toBeGreaterThan(0);
    expect(screen.getByText("Weekly availability")).toBeInTheDocument();
  });

  it("preselecciona un hueco libre y ofrece reservarlo", () => {
    render(<AvailabilityPage />);

    expect(screen.getByText("Your selection")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book now" })).toBeInTheDocument();
  });

  it("cambia la selección al hacer clic en otra celda libre", async () => {
    const user = userEvent.setup({ delay: null });
    const lounge = LOUNGES.find((l) => l.id === "the-ainsworth")!;
    const weekStart = mondayOf("2025-09-09");
    const cells = weeklyAvailability(lounge, weekStart);
    const available = cells.filter((cell) => cell.status === "available");
    const target = available[available.length - 1];
    const band = WEEK_BANDS.find((b) => b.id === target.band)!;

    render(<AvailabilityPage />);

    const cellButton = screen.getByRole("button", {
      name: new RegExp(`${band.label}: ${target.seatsLeft} seats left`),
    });
    await user.click(cellButton);

    expect(cellButton).toHaveAttribute("aria-pressed", "true");
  });

  it("avanza a la semana siguiente", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AvailabilityPage />);

    const before = screen.getByRole("heading", { level: 2, name: /–/ }).textContent;
    await user.click(screen.getByRole("button", { name: "Next week" }));
    const after = screen.getByRole("heading", { level: 2, name: /–/ }).textContent;

    expect(after).not.toBe(before);
  });

  it("lista las restricciones de reserva", () => {
    render(<AvailabilityPage />);

    expect(screen.getByText("Booking restrictions")).toBeInTheDocument();
    expect(screen.getByText("Admission for one member")).toBeInTheDocument();
  });
});

describe("cierre por festivo", () => {
  it("avisa del cierre cuando la semana mostrada lo incluye", () => {
    searchParams.mockReturnValue(new URLSearchParams("week=2025-11-24"));
    render(<AvailabilityPage />);

    expect(screen.getAllByText(/Thanksgiving/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Find another lounge" })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("no aparece cuando la semana no tiene ningún cierre", () => {
    render(<AvailabilityPage />);

    expect(screen.queryByText(/Thanksgiving/)).toBeNull();
  });
});
