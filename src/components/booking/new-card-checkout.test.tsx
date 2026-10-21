import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider } from "./booking-context";
import { PaymentMethodForm } from "./payment-method-form";
import { StripeCheckoutBridge } from "./stripe-checkout-bridge";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

/**
 * Ticket 001 — "Use a new card" en el paso 2 (Story 4.2). Montado como en
 * `BookLayout` (bridge por encima del formulario) y en `StrictMode`, como
 * corre el dev server: cada intento debe dejar una sola Checkout Session,
 * que es la misma que luego se confirma. Marcar "Save this card" cuenta como
 * intento nuevo (la sesión lleva `setup_future_usage`): una sesión más, no
 * varias. Requiere `supabase functions serve --env-file supabase/functions/.env`.
 */
let ainsworth: LoungeProfile;

beforeAll(async () => {
  await freshMember("lounge-reader");
  ainsworth = await fetchAinsworthProfile(createClient());
});

async function freshMember(label: string) {
  return signUpConfirmedMemberAndSignIn(
    createClient(),
    `new-card-${Date.now()}-${label}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
}

function renderPaymentStep() {
  return render(
    <React.StrictMode>
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{ dateIso: "2025-09-12", time: "1:00 PM", band: "afternoon" }}
      >
        <StripeCheckoutBridge>
          <PaymentMethodForm />
        </StripeCheckoutBridge>
      </BookingProvider>
    </React.StrictMode>,
  );
}

async function pendingPayments(memberId: string) {
  const { data, error } = await createClient()
    .from("payments")
    .select("id")
    .eq("member_id", memberId)
    .eq("status", "pending");
  if (error) throw error;
  return data;
}

/** Deja pasar las respuestas que llegarían tarde (una segunda sesión) antes de contar. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 2000));

describe("una sola Checkout Session por intento", () => {
  it("elegir 'Use a new card' deja una sola fila payments en pending", async () => {
    const member = await freshMember("single");
    const user = userEvent.setup({ delay: null });
    renderPaymentStep();

    await user.click(await screen.findByRole("radio", { name: /Use a new card/ }));

    await waitFor(async () => expect(await pendingPayments(member.id)).not.toHaveLength(0), {
      timeout: 15000,
    });
    await settle();
    expect(await pendingPayments(member.id)).toHaveLength(1);
  }, 30000);

  it("marcar 'Save this card' abre una sola sesión nueva, con la que se pagará", async () => {
    const member = await freshMember("save-toggle");
    const user = userEvent.setup({ delay: null });
    renderPaymentStep();

    await user.click(await screen.findByRole("radio", { name: /Use a new card/ }));
    await waitFor(async () => expect(await pendingPayments(member.id)).not.toHaveLength(0), {
      timeout: 15000,
    });
    await settle();
    await user.click(screen.getByRole("checkbox", { name: /Save this card/ }));

    await waitFor(async () => expect(await pendingPayments(member.id)).toHaveLength(2), {
      timeout: 15000,
    });
    await settle();
    expect(await pendingPayments(member.id)).toHaveLength(2);
  }, 30000);
});

describe("si Stripe no responde", () => {
  it("avisa del error en lugar de quedarse cargando", async () => {
    await createClient().auth.signOut();
    const user = userEvent.setup({ delay: null });
    renderPaymentStep();

    await user.click(screen.getByRole("radio", { name: /Use a new card/ }));

    expect(await screen.findByRole("alert", {}, { timeout: 15000 })).toHaveTextContent(
      /couldn.t load/i,
    );
    expect(screen.queryByText(/Loading Stripe/)).not.toBeInTheDocument();
  }, 30000);
});
