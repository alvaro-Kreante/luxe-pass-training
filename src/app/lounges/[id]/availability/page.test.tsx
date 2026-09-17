import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { mondayOf, weeklyAvailability, WEEK_BANDS } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import AvailabilityPage from "./page";

/**
 * Story 3.2 — Availability.
 * Criterios en docs/specs/epic-3-lounge-profiles-details/story-3.2-availability.md
 * y el segmento "Story 3.2" de flow-complete-booking-journey.md.
 *
 * Backend real: la semilla de `lounge_availability` reproduce la misma
 * fórmula determinista que `weeklyAvailability` (legacy, sobre el mock de
 * `lib/lounges.ts` — sigue viva para Epic 4, ver `lounge-profile.ts`), así
 * que "cambia la selección" puede seguir derivando su objetivo de ahí en
 * vez de fijar un valor literal.
 */

const params = vi.fn(() => ({ id: "the-ainsworth" }));
const searchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  useSearchParams: () => searchParams(),
  usePathname: () => "/lounges/the-ainsworth/availability",
  useRouter: () => ({ replace: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `lounge-availability-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
});

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
  searchParams.mockReturnValue(new URLSearchParams());
});

describe("calendario semanal", () => {
  it("muestra el nombre del lounge y la semana actual", async () => {
    render(<AvailabilityPage />);

    await waitFor(() =>
      expect(screen.getAllByText("The Ainsworth").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("Weekly availability")).toBeInTheDocument();
  });

  it("preselecciona un hueco libre y ofrece reservarlo", async () => {
    render(<AvailabilityPage />);

    await waitFor(() => expect(screen.getByText("Your selection")).toBeInTheDocument());
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

    const cellButton = await screen.findByRole("button", {
      name: new RegExp(`${band.label}: ${target.seatsLeft} seats left`),
    });
    await user.click(cellButton);

    expect(cellButton).toHaveAttribute("aria-pressed", "true");
  });

  it("avanza a la semana siguiente", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AvailabilityPage />);

    const before = (
      await screen.findByRole("heading", { level: 2, name: /–/ })
    ).textContent;
    await user.click(screen.getByRole("button", { name: "Next week" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 2, name: /–/ }).textContent,
      ).not.toBe(before),
    );
  });

  it("lista las restricciones de reserva", async () => {
    render(<AvailabilityPage />);

    await waitFor(() =>
      expect(screen.getByText("Booking restrictions")).toBeInTheDocument(),
    );
    expect(screen.getByText("Admission for one member")).toBeInTheDocument();
  });
});

describe("cierre por festivo", () => {
  it("avisa del cierre cuando la semana mostrada lo incluye", async () => {
    searchParams.mockReturnValue(new URLSearchParams("week=2025-11-24"));
    render(<AvailabilityPage />);

    await waitFor(() =>
      expect(screen.getAllByText(/Thanksgiving/).length).toBeGreaterThan(0),
    );
    expect(screen.getByRole("link", { name: "Find another lounge" })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("no aparece cuando la semana no tiene ningún cierre", async () => {
    render(<AvailabilityPage />);

    await waitFor(() =>
      expect(screen.getByText("Weekly availability")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Thanksgiving/)).toBeNull();
  });
});
