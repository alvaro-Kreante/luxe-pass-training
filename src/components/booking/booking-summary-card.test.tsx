import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider } from "./booking-context";
import { BookingSummaryCard } from "./booking-summary-card";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.1 — "Booking summary before confirmation: review lounge,
 * date/time, requests" (`Summary.dc.html`).
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `booking-summary-card-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function renderCard(specialRequests = "") {
  return render(
    <BookingProvider
      lounge={ainsworth}
      covered={false}
      initialDraft={{
        dateIso: "2025-09-14",
        time: "3:30 PM",
        paymentMethodId: "pm_visa_4242",
        specialRequests,
      }}
    >
      <BookingSummaryCard />
    </BookingProvider>,
  );
}

describe("resumen de la reserva", () => {
  it("muestra la fecha, la hora, la admisión y el método de pago", () => {
    renderCard();

    expect(screen.getByText(/Sun, Sep 14/)).toBeInTheDocument();
    expect(screen.getByText("3:30 PM")).toBeInTheDocument();
    expect(screen.getByText("1 member")).toBeInTheDocument();
    expect(screen.getByText(/Visa ending in 4242/)).toBeInTheDocument();
  });

  it("cada dato editable enlaza de vuelta a su paso", () => {
    renderCard();

    const dateEdit = screen.getAllByRole("link", { name: "Edit" })[0];
    expect(dateEdit).toHaveAttribute("href", `/lounges/${ainsworth.id}/book`);
  });

  it("muestra las peticiones especiales cuando existen", () => {
    renderCard("Quiet desk near a window");

    expect(screen.getByText("Quiet desk near a window")).toBeInTheDocument();
  });

  it("declara que no hay peticiones cuando el campo está vacío", () => {
    renderCard();

    expect(screen.getByText("None")).toBeInTheDocument();
  });
});
