import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider } from "./booking-context";
import { ConfirmedVisitCard } from "./confirmed-visit-card";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.1 — "Immediate booking confirmation screen" (`Confirmed.dc.html`).
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `confirmed-visit-card-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function renderCard(covered = false) {
  return render(
    <BookingProvider
      lounge={ainsworth}
      covered={covered}
      initialDraft={{
        dateIso: "2025-09-14",
        time: "3:30 PM",
        paymentMethodId: "pm_visa_4242",
        specialRequests: "Quiet desk near a window if possible.",
      }}
    >
      <ConfirmedVisitCard />
    </BookingProvider>,
  );
}

describe("tarjeta de detalle de la visita confirmada", () => {
  it("muestra el lounge y el estado confirmado", () => {
    renderCard();

    expect(screen.getByText("The Ainsworth")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("muestra fecha, hora, admisión, peticiones y el pago realizado", () => {
    renderCard();

    expect(screen.getByText(/Sun, Sep 14/)).toBeInTheDocument();
    expect(screen.getByText(/3:30 PM/)).toBeInTheDocument();
    expect(screen.getByText("1 member")).toBeInTheDocument();
    expect(screen.getByText("Quiet desk near a window if possible.")).toBeInTheDocument();
    expect(screen.getByText(/Paid \$81\.66 · Visa 4242/)).toBeInTheDocument();
  });

  it("cuando la visita está cubierta, el pago dice que está incluido en la membresía", () => {
    renderCard(true);

    expect(screen.getByText(/Included in your membership/)).toBeInTheDocument();
  });
});
