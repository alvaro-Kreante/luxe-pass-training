import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider, useBooking } from "./booking-context";
import { TermsPolicyCard } from "./terms-policy-card";
import { CANCELLATION_POLICY } from "@/lib/booking";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.1 — "Terms and cancellation policy display: must acknowledge"
 * (`Summary.dc.html`).
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `terms-policy-card-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function DraftInspector() {
  const { draft } = useBooking();
  return <p data-testid="accepted">{String(draft.acceptedTerms)}</p>;
}

function renderCard() {
  return render(
    <BookingProvider lounge={ainsworth} covered={false}>
      <TermsPolicyCard />
      <DraftInspector />
    </BookingProvider>,
  );
}

describe("política de cancelación", () => {
  it("muestra el texto de la política", () => {
    renderCard();

    for (const paragraph of CANCELLATION_POLICY) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });
});

describe("casilla de aceptación", () => {
  it("empieza sin marcar", () => {
    renderCard();

    expect(screen.getByTestId("accepted")).toHaveTextContent("false");
  });

  it("marcarla actualiza el borrador de reserva", async () => {
    const user = userEvent.setup({ delay: null });
    renderCard();

    await user.click(
      screen.getByRole("checkbox", { name: /accept the booking terms/ }),
    );

    expect(screen.getByTestId("accepted")).toHaveTextContent("true");
  });
});
