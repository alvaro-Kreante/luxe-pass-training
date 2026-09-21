import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PaymentErrorModal } from "./payment-error-modal";

/**
 * Story 4.1 — "Error handling: network issues, booking conflicts, system
 * unavailability" + "Retry options" (`PaymentError.dc.html`).
 */
function renderModal() {
  const onOpenChange = vi.fn();
  const onTryAgain = vi.fn();
  const onContactSupport = vi.fn();

  render(
    <PaymentErrorModal
      open
      onOpenChange={onOpenChange}
      time="3:30 PM"
      cardLabel="Visa ending in 4242"
      message="Your card was declined."
      reference="LP-ERR-4471"
      secondsLeft={408}
      onTryAgain={onTryAgain}
      onContactSupport={onContactSupport}
    />,
  );

  return { onOpenChange, onTryAgain, onContactSupport };
}

describe("PaymentError.dc.html", () => {
  it("anuncia el rechazo del banco y que no se cobró nada", () => {
    renderModal();

    expect(screen.getByText("We could not take the payment")).toBeInTheDocument();
    expect(screen.getByText(/Your card was declined\..*Visa ending in 4242/)).toBeInTheDocument();
  });

  it("muestra la referencia del error y el tiempo restante del slot", () => {
    renderModal();

    expect(screen.getByText("Reference LP-ERR-4471")).toBeInTheDocument();
    expect(screen.getByText("6:48")).toBeInTheDocument();
  });

  it("ofrece las tres alternativas de recuperación", () => {
    renderModal();

    expect(screen.getByText("Try the same card again")).toBeInTheDocument();
    expect(screen.getByText("Use another payment method")).toBeInTheDocument();
    expect(screen.getByText("Choose a different time")).toBeInTheDocument();
  });

  it("'Try again' llama a onTryAgain", async () => {
    const user = userEvent.setup({ delay: null });
    const { onTryAgain } = renderModal();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onTryAgain).toHaveBeenCalledTimes(1);
  });

  it("'Contact support' llama a onContactSupport", async () => {
    const user = userEvent.setup({ delay: null });
    const { onContactSupport } = renderModal();

    await user.click(screen.getByRole("button", { name: "Contact support" }));

    expect(onContactSupport).toHaveBeenCalledTimes(1);
  });
});
