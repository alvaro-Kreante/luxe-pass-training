import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "./booking-context";
import { ConfirmPaymentRail } from "./confirm-payment-rail";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Story 4.1 — "One-tap booking confirmation" (`Summary.dc.html`).
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `confirm-payment-rail-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function renderRail(
  overrides: { acceptedTerms?: boolean; paymentMethodId?: string | null } = {},
  covered = false,
) {
  const onConfirm = vi.fn();
  render(
    <BookingProvider
      lounge={ainsworth}
      covered={covered}
      initialDraft={{
        dateIso: "2025-09-14",
        time: "3:30 PM",
        paymentMethodId: "pm_visa_4242",
        acceptedTerms: true,
        ...overrides,
      }}
    >
      <ConfirmPaymentRail onConfirm={onConfirm} />
    </BookingProvider>,
  );
  return { onConfirm };
}

describe("botón de confirmación de un toque", () => {
  it("está deshabilitado sin aceptar los términos", () => {
    renderRail({ acceptedTerms: false });

    expect(
      screen.getByRole("button", { name: /Confirm and pay/ }),
    ).toBeDisabled();
  });

  it("llama a onConfirm al pulsar, una vez aceptados los términos", async () => {
    const user = userEvent.setup({ delay: null });
    const { onConfirm } = renderRail();

    await user.click(screen.getByRole("button", { name: /Confirm and pay/ }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("el texto del botón incluye el total a cobrar", () => {
    renderRail();

    expect(screen.getByRole("button", { name: "Confirm and pay $81.66" })).toBeInTheDocument();
  });
});

describe("visita cubierta por la membresía", () => {
  it("desglosa el day pass y el impuesto en $0.00, no una sola fila", () => {
    renderRail({}, true);

    expect(screen.getByText("Day pass")).toBeInTheDocument();
    expect(screen.getByText("Included")).toBeInTheDocument();
    expect(screen.getByText("Sales tax")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(2);
  });

  it("el botón no promete cobrar nada", () => {
    renderRail({}, true);

    expect(screen.getByRole("button", { name: "Confirm booking" })).toBeInTheDocument();
  });

  it("aclara que no se cobra ninguna tarjeta", () => {
    renderRail({}, true);

    expect(
      screen.getByText(/No card is charged for an included visit/),
    ).toBeInTheDocument();
  });
});
