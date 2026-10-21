import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { BookingProvider, useBooking } from "./booking-context";
import { PaymentMethodForm } from "./payment-method-form";
import { NEW_CARD_OPTION_ID } from "@/lib/booking";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";
import { attachTestCard, setDefaultPaymentMethod } from "@/lib/testing/stripe-fixture";

/**
 * Story 4.2 — Payment Processing, conectada a Stripe real. Requiere
 * `supabase functions serve --env-file supabase/functions/.env` corriendo
 * (ver `src/lib/stripe-payments.test.ts`) — las tarjetas guardadas salen de
 * un Customer de Stripe real, sembrado aquí con `pm_card_visa` (tarjeta de
 * prueba real, no un mock).
 */
let ainsworth: LoungeProfile;
let otherCardId: string;

beforeAll(async () => {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `payment-method-form-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);

  // `listSavedPaymentMethods` crea el Customer de Stripe de forma perezosa
  // (ver `ensureStripeCustomer`) — se llama una vez para tener su id.
  const { listSavedPaymentMethods } = await import("@/lib/stripe-payments");
  await listSavedPaymentMethods(supabase);
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  const customerId = profile!.stripe_customer_id as string;

  const defaultCardId = await attachTestCard(customerId);
  await setDefaultPaymentMethod(customerId, defaultCardId);
  otherCardId = await attachTestCard(customerId);
});

function DraftInspector() {
  const { draft } = useBooking();
  return <p data-testid="draft">{draft.paymentMethodId ?? "none"}</p>;
}

function renderForm(covered = false) {
  return render(
    <BookingProvider
      lounge={ainsworth}
      covered={covered}
      initialDraft={{ dateIso: "2025-09-01", time: "1:00 PM", band: "afternoon" }}
    >
      <PaymentMethodForm />
      <DraftInspector />
    </BookingProvider>,
  );
}

describe("camino por defecto — day pass", () => {
  it("preselecciona el método de pago marcado por defecto", async () => {
    renderForm();

    await waitFor(() =>
      expect(screen.getByTestId("draft")).not.toHaveTextContent("none"),
    );
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("elegir otro método guardado actualiza el borrador", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    const removableCard = await screen.findByRole("radio", {
      name: (name) => /ending in \d{4}/.test(name) && !name.includes("Default"),
    });
    await user.click(removableCard);

    await waitFor(() =>
      expect(screen.getByTestId("draft")).toHaveTextContent(otherCardId),
    );
  });

  it("elegir 'Use a new card' selecciona la opción de tarjeta nueva", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(screen.getByRole("radio", { name: /Use a new card/ }));

    expect(screen.getByTestId("draft")).toHaveTextContent(NEW_CARD_OPTION_ID);
  });

  it("declara el procesamiento por Stripe y el cumplimiento PCI DSS", () => {
    renderForm();

    expect(screen.getByText(/processed by Stripe/)).toBeInTheDocument();
    expect(screen.getByText(/PCI DSS/)).toBeInTheDocument();
  });

  it("quitar un método guardado lo retira de la lista", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    const removeLinks = await screen.findAllByRole("link", { name: "Remove" });
    await user.click(removeLinks[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("radio", { name: /ending in/ })).toHaveLength(1);
    });
  });
});

describe("visita cubierta por la membresía", () => {
  it("no exige método de pago y explica que no se cobra nada", () => {
    renderForm(true);

    expect(screen.getByText(/No payment method is needed/)).toBeInTheDocument();
    expect(screen.getByText("This visit is included")).toBeInTheDocument();
    expect(
      screen.getByText(/Your annual membership covers this booking/),
    ).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("muestra el plan, la renovación y el importe anual, con la tarjeta real del miembro", async () => {
    renderForm(true);

    expect(screen.getByText("Annual · En Soleil")).toBeInTheDocument();
    expect(screen.getByText(/Renews March 3, 2027/)).toBeInTheDocument();
    expect(await screen.findByText(/billed to Visa ending in 4242/)).toBeInTheDocument();
    expect(screen.getByText("$2,400")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage plan" })).toHaveAttribute("href", "/profile/membership");
  });

  it("muestra las visitas incluidas usadas este mes y qué pasa al agotarlas", () => {
    renderForm(true);

    expect(screen.getByText("Visits included this month")).toBeInTheDocument();
    expect(screen.getByText("4 of 8 used")).toBeInTheDocument();
    expect(screen.getByText(/This booking is visit 4/)).toBeInTheDocument();
  });

  it("muestra la tarjeta guardada que respalda renovaciones y day passes", async () => {
    renderForm(true);

    expect(await screen.findByText("Visa ending in 4242 kept on file")).toBeInTheDocument();
    expect(screen.getByText(/Stored by Stripe/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change" })).toBeInTheDocument();
  });
});

describe("visita pagada con un day pass de regalo (Epic 9)", () => {
  it("dice qué day pass la cubre y que las visitas incluidas no se tocan", () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered={{
          kind: "day_pass_credit",
          plan: "annual",
          visitsUsed: 2,
          visitsIncluded: 8,
          creditSource: "referral",
          creditsAvailable: 1,
          renewalDate: "2027-03-03T00:00:00Z",
        }}
        initialDraft={{ dateIso: "2025-09-01", time: "1:00 PM", band: "afternoon" }}
      >
        <PaymentMethodForm />
      </BookingProvider>,
    );

    expect(screen.getByText("This visit is included")).toBeInTheDocument();
    expect(screen.getByText(/complimentary day pass from a referral covers this booking/)).toBeInTheDocument();
    expect(screen.getByText("2 of 8 used")).toBeInTheDocument();
    expect(screen.getByText(/your included visits stay as they are/)).toBeInTheDocument();
  });
});
