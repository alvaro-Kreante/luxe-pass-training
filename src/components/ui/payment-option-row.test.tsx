import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PaymentOptionRow } from "./payment-option-row";

/**
 * DESIGN-SYSTEM.md §4 — Fila de opción / método de pago. Reutilizada por los
 * métodos de pago guardados (Payment.dc.html) y por las alternativas de
 * Waitlist.dc.html / PaymentError.dc.html.
 */
describe("PaymentOptionRow", () => {
  it("llama a onSelect al pulsarla", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = vi.fn();
    render(
      <PaymentOptionRow selected={false} onSelect={onSelect} title="Visa ending in 4242" />,
    );

    await user.click(screen.getByRole("radio", { name: /Visa ending in 4242/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("expone su estado seleccionado de forma accesible", () => {
    render(<PaymentOptionRow selected title="Visa ending in 4242" onSelect={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /Visa ending in 4242/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("no llama a onSelect cuando está deshabilitada", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = vi.fn();
    render(
      <PaymentOptionRow
        selected={false}
        disabled
        title="Fully booked slot"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /Fully booked slot/ }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("muestra el subtítulo y el contenido final cuando se pasan", () => {
    render(
      <PaymentOptionRow
        selected={false}
        title="Visa ending in 4242"
        subtitle="Alexandra Rivas · expires 04/28"
        trailing={<span>Default</span>}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Alexandra Rivas · expires 04/28")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });
});
