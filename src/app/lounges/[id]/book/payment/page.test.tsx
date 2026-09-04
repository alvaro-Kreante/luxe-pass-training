import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import { LOUNGES } from "@/lib/lounges";

import PaymentPage from "./page";

/**
 * Story 4.2 — paso 2 "Payment method" (`Payment.dc.html` /
 * `MembershipCovered.dc.html`).
 */
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/lounges/the-ainsworth/book/payment",
}));

beforeEach(() => {
  replace.mockClear();
});

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

describe("guardia de entrada", () => {
  it("vuelve al paso 1 si no hay fecha ni hora elegidas", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <PaymentPage />
      </BookingProvider>,
    );

    expect(replace).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book`);
  });
});

describe("con visita ya elegida", () => {
  it("muestra el paso 2 de 3 sin redirigir", () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{ dateIso: "2025-09-14", time: "3:30 PM" }}
      >
        <PaymentPage />
      </BookingProvider>,
    );

    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
