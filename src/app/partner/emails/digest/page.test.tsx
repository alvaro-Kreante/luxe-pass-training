import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MorningDigestEmailPage from "./page";

/**
 * Story 7.2 — "Morning digest email with day's guest list". Artboard:
 * EmailDigest.dc.html.
 */
describe("EmailDigest.dc.html", () => {
  it("anuncia el día con el total esperado", () => {
    render(<MorningDigestEmailPage />);

    expect(screen.getByText("14 guests expected")).toBeVisible();
  });

  it("lista las primeras llegadas y remite al resto", () => {
    render(<MorningDigestEmailPage />);

    expect(screen.getByText("Marcus Ellery")).toBeVisible();
    expect(screen.getByText("Sofia Marchetti")).toBeVisible();
    expect(screen.getByText(/6 more, from 2:00 PM to 6:00 PM/)).toBeVisible();
  });

  it("enlaza de vuelta a la lista del día", () => {
    render(<MorningDigestEmailPage />);

    expect(screen.getByRole("link", { name: "Open today's list" })).toHaveAttribute(
      "href",
      "/partner",
    );
  });
});
