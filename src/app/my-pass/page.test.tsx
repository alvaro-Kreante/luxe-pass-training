import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AINSWORTH_PASS } from "@/lib/passes";

import MyPassPage from "./page";

/**
 * Story 5.1 (Digital Pass Generation) — "Information available from My
 * Bookings section". `MyBookings.dc.html` (Upcoming) y `NoShow.dc.html`
 * (Past, con el criterio "No-show tracking" de la Story 5.2).
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/my-pass",
}));

describe("pestaña Upcoming (por defecto)", () => {
  it("muestra la próxima visita con su número de confirmación y un enlace al pase", () => {
    render(<MyPassPage />);

    expect(screen.getByRole("heading", { name: "My Pass" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: AINSWORTH_PASS.loungeName, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view pass/i }),
    ).toHaveAttribute("href", `/my-pass/${AINSWORTH_PASS.reference}`);
  });

  it("muestra cuántas visitas del mes ya se han usado", () => {
    render(<MyPassPage />);

    expect(screen.getByText("3 of 8")).toBeInTheDocument();
  });
});

describe("pestaña Past", () => {
  it("al activarla, muestra el historial y explica el no-show", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    await user.click(screen.getByRole("tab", { name: /past/i }));

    expect(screen.getByRole("tab", { name: /past/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Bergdorf Lounge")).toBeInTheDocument();
    expect(
      screen.getByText(/booking window closed at 11:00 PM without a check-in/i),
    ).toBeInTheDocument();
  });
});
