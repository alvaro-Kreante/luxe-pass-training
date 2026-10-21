import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile } from "@/lib/testing/lounge-fixture";

import ReceiptPage from "./page";

/**
 * Story 4.2 — "Payment confirmation email receipt" (`Receipt.dc.html`).
 * Sin backend de pago (Story 4.2, sin conectar), este criterio se cubre
 * visualmente: la pantalla del email tal como llegaría. La reserva sí es
 * real (Story 4.1 conectada) — el guard exige `draft.bookingId`.
 */
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/lounges/the-ainsworth/book/receipt",
}));

beforeEach(() => {
  replace.mockClear();
});

let ainsworth: LoungeProfile;
const memberEmail = `book-receipt-${Date.now()}@ensoleil-test.example`;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    memberEmail,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

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
          bookingId: "11111111-1111-1111-1111-111111111111",
          bookingStatus: "confirmed",
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

describe("destinatario del recibo", () => {
  it("dirige el recibo al email real del miembro con sesión, no al de muestra", async () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: "2025-09-14",
          time: "3:30 PM",
          specialRequests: "",
          bookingId: "11111111-1111-1111-1111-111111111111",
          bookingStatus: "confirmed",
        }}
      >
        <ReceiptPage />
      </BookingProvider>,
    );

    expect(await screen.findByText(new RegExp(memberEmail))).toBeInTheDocument();
    expect(screen.queryByText(/alexandra\.rivas@example\.com/)).not.toBeInTheDocument();
  });
});
