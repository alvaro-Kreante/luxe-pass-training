import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NewBookingEmailPage from "./page";

/**
 * Story 7.2 — "Email notification for each new booking". Artboard:
 * EmailNewBooking.dc.html. Sin backend, se cubre visualmente como el resto
 * de emails del proyecto (`Receipt.dc.html`).
 */
describe("EmailNewBooking.dc.html", () => {
  it("anuncia la reserva nueva con la hora y la referencia", () => {
    render(<NewBookingEmailPage />);

    expect(screen.getByText("Tonight, 7:00 PM")).toBeVisible();
    expect(screen.getByText("Naomi Feldstein")).toBeVisible();
    expect(screen.getByText("LP-842905")).toBeVisible();
  });

  it("muestra el contador de invitados actualizado", () => {
    render(<NewBookingEmailPage />);

    expect(screen.getByText("15")).toBeVisible();
    expect(screen.getByText(/was 14/)).toBeVisible();
  });

  it("enlaza de vuelta a la lista del día", () => {
    render(<NewBookingEmailPage />);

    expect(screen.getByRole("link", { name: "Open today's list" })).toHaveAttribute(
      "href",
      "/partner",
    );
  });
});
