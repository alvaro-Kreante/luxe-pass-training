import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CancellationEmailPage from "./page";

/**
 * Story 7.2 — "Cancellation notifications with updated guest count" y
 * "waitlist promotion alerts". Artboard: EmailCancellation.dc.html.
 */
describe("EmailCancellation.dc.html", () => {
  it("anuncia la cancelación con el recuento corregido", () => {
    render(<CancellationEmailPage />);

    expect(screen.getByText("Harriet Osei · 5:00 PM arrival")).toBeVisible();
    expect(screen.getByText("14")).toBeVisible();
  });

  it("anuncia la promoción automática desde la waitlist", () => {
    render(<CancellationEmailPage />);

    expect(screen.getByText("Victor Almeida · 5:00 PM arrival")).toBeVisible();
    expect(screen.getByText("15")).toBeVisible();
  });

  it("enlaza de vuelta a la lista del día", () => {
    render(<CancellationEmailPage />);

    expect(screen.getByRole("link", { name: "Open today's list" })).toHaveAttribute(
      "href",
      "/partner",
    );
  });
});
