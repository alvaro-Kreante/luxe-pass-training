import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider } from "./booking-context";
import { PaymentSummaryRail } from "./payment-summary-rail";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.2 — rail derecho del paso 2 (`Payment.dc.html` /
 * `MembershipCovered.dc.html`).
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `payment-summary-rail-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

describe("botón de avance — camino por defecto", () => {
  it("está deshabilitado sin método de pago elegido", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <PaymentSummaryRail />
      </BookingProvider>,
    );

    expect(screen.getByRole("button", { name: "Review and confirm" })).toBeDisabled();
  });
});

describe("botón de avance — visita cubierta", () => {
  it("no exige elegir método de pago", () => {
    render(
      <BookingProvider lounge={ainsworth} covered>
        <PaymentSummaryRail />
      </BookingProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Review and confirm" }),
    ).toHaveAttribute("href", `/lounges/${ainsworth.id}/book/summary`);
  });
});

describe("total debido hoy", () => {
  it("cuando la visita está cubierta, el day pass y el impuesto salen en $0.00", () => {
    render(
      <BookingProvider lounge={ainsworth} covered>
        <PaymentSummaryRail />
      </BookingProvider>,
    );

    expect(screen.getByText("Day pass")).toBeInTheDocument();
    expect(screen.getByText("Included")).toBeInTheDocument();
    expect(screen.getByText("Sales tax")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(2);
  });

  it("cuando la visita está cubierta, aclara que no se cobra ninguna tarjeta", () => {
    render(
      <BookingProvider lounge={ainsworth} covered>
        <PaymentSummaryRail />
      </BookingProvider>,
    );

    expect(
      screen.getByText(/No card is charged for an included visit/),
    ).toBeInTheDocument();
  });

  it("muestra el total con impuesto cuando se factura como day pass", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <PaymentSummaryRail />
      </BookingProvider>,
    );

    expect(screen.getByText("$81.66")).toBeInTheDocument();
  });
});
