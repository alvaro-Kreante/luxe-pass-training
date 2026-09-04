import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import { LOUNGES } from "@/lib/lounges";

import ReceiptPage from "./page";

/**
 * Story 4.2 — "Payment confirmation email receipt" (`Receipt.dc.html`).
 * Sin backend, este criterio se cubre visualmente: la pantalla del email tal
 * como llegaría, con datos de muestra.
 */
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/lounges/the-ainsworth/book/receipt",
}));

beforeEach(() => {
  replace.mockClear();
});

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

describe("guardia de entrada", () => {
  it("vuelve al paso 1 si no hay una reserva confirmada", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <ReceiptPage />
      </BookingProvider>,
    );

    expect(replace).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book`);
  });
});

describe("con una reserva confirmada", () => {
  function renderReceipt(covered = false) {
    return render(
      <BookingProvider
        lounge={ainsworth}
        covered={covered}
        initialDraft={{
          dateIso: "2025-09-14",
          time: "3:30 PM",
          specialRequests: "Quiet desk near a window, still water on arrival.",
        }}
      >
        <ReceiptPage />
      </BookingProvider>,
    );
  }

  it("muestra el remitente, el asunto y el número de reserva", () => {
    renderReceipt();

    expect(screen.getByText(/bookings@luxepass.co/)).toBeInTheDocument();
    expect(
      screen.getByText(/Your visit at The Ainsworth is confirmed — LP-\d{6}/),
    ).toBeInTheDocument();
  });

  it("desglosa el pago: día pass, impuesto y total", () => {
    renderReceipt();

    expect(screen.getByText("$75.00")).toBeInTheDocument();
    expect(screen.getByText("$6.66")).toBeInTheDocument();
    expect(screen.getByText("$81.66")).toBeInTheDocument();
  });

  it("cuando la visita está cubierta, el desglose muestra la membresía y no un cargo", () => {
    renderReceipt(true);

    expect(screen.getByText(/Included in your membership/)).toBeInTheDocument();
  });
});
