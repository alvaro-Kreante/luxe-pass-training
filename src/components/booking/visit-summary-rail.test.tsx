import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingProvider } from "./booking-context";
import { VisitSummaryRail } from "./visit-summary-rail";
import { LOUNGES } from "@/lib/lounges";

/**
 * Story 4.1 (Booking summary) + Story 4.2 (Subscription/day-pass pricing).
 */
const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

describe("botón de avance", () => {
  it("está deshabilitado hasta elegir fecha y hora", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <VisitSummaryRail />
      </BookingProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Choose payment method" }),
    ).toBeDisabled();
  });
});

describe("precio — day pass (camino por defecto)", () => {
  it("desglosa el day pass, el impuesto y el total", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <VisitSummaryRail />
      </BookingProvider>,
    );

    expect(screen.getByText("$75.00")).toBeInTheDocument();
    expect(screen.getByText("$6.66")).toBeInTheDocument();
    expect(screen.getByText("$81.66")).toBeInTheDocument();
  });
});

describe("precio — visita cubierta por la membresía", () => {
  it("desglosa el day pass y el impuesto en $0.00, no una sola fila", () => {
    render(
      <BookingProvider lounge={ainsworth} covered>
        <VisitSummaryRail />
      </BookingProvider>,
    );

    expect(screen.getByText("Day pass")).toBeInTheDocument();
    expect(screen.getByText("Included")).toBeInTheDocument();
    expect(screen.getByText("Estimated tax")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(2);
  });
});
