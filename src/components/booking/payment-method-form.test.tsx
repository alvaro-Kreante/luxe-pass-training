import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BookingProvider, useBooking } from "./booking-context";
import { PaymentMethodForm } from "./payment-method-form";
import { NEW_CARD_OPTION_ID, SAMPLE_PAYMENT_METHODS } from "@/lib/booking";
import { LOUNGES } from "@/lib/lounges";

/**
 * Story 4.2 — Payment Processing.
 * Criterios: Stripe integration, credit/debit cards, Apple Pay/Google Pay,
 * payment method storage, subscription pricing when the visit is covered.
 */
const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const defaultMethod = SAMPLE_PAYMENT_METHODS.find((method) => method.isDefault)!;
const otherMethod = SAMPLE_PAYMENT_METHODS.find((method) => !method.isDefault)!;

function DraftInspector() {
  const { draft } = useBooking();
  return <p data-testid="draft">{draft.paymentMethodId ?? "none"}</p>;
}

function renderForm(covered = false) {
  return render(
    <BookingProvider lounge={ainsworth} covered={covered}>
      <PaymentMethodForm />
      <DraftInspector />
    </BookingProvider>,
  );
}

describe("camino por defecto — day pass", () => {
  it("preselecciona el método de pago marcado por defecto", () => {
    renderForm();

    expect(screen.getByTestId("draft")).toHaveTextContent(defaultMethod.id);
  });

  it("elegir otro método guardado actualiza el borrador", async () => {
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(
      screen.getByRole("radio", { name: new RegExp(`ending in ${otherMethod.last4}`) }),
    );

    expect(screen.getByTestId("draft")).toHaveTextContent(otherMethod.id);
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

    await user.click(screen.getByRole("link", { name: "Remove" }));

    expect(
      screen.queryByText(new RegExp(`ending in ${otherMethod.last4}`)),
    ).not.toBeInTheDocument();
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

  it("muestra el plan, la renovación y el importe anual", () => {
    renderForm(true);

    expect(screen.getByText("Annual · En Soleil")).toBeInTheDocument();
    expect(screen.getByText(/Renews March 3/)).toBeInTheDocument();
    expect(screen.getByText(`billed to Visa ending in ${defaultMethod.last4}`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText("$2,400")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage plan" })).toBeInTheDocument();
  });

  it("muestra las visitas incluidas usadas este mes y qué pasa al agotarlas", () => {
    renderForm(true);

    expect(screen.getByText("Visits included this month")).toBeInTheDocument();
    expect(screen.getByText("4 of 8 used")).toBeInTheDocument();
    expect(screen.getByText(/This booking is visit 4/)).toBeInTheDocument();
  });

  it("muestra la tarjeta guardada que respalda renovaciones y day passes", () => {
    renderForm(true);

    expect(
      screen.getByText(`Visa ending in ${defaultMethod.last4} kept on file`),
    ).toBeInTheDocument();
    expect(screen.getByText(/Stored by Stripe/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change" })).toBeInTheDocument();
  });
});
