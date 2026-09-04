import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import { WAITLIST_THRESHOLD_SEATS } from "@/lib/booking";
import { LOUNGES } from "@/lib/lounges";

import SummaryPage from "./page";

/**
 * Story 4.1 — paso 3 "Review and confirm" (`Summary.dc.html`), con las
 * ramas de `Waitlist.dc.html` y `PaymentError.dc.html` del chequeo final.
 */
const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/lounges/the-ainsworth/book/summary",
}));

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

async function acceptTermsAndConfirm() {
  const user = userEvent.setup({ delay: null });
  await user.click(
    screen.getByRole("checkbox", { name: /accept the booking terms/ }),
  );
  await user.click(screen.getByRole("button", { name: /Confirm and pay|Confirm booking/ }));
  return user;
}

describe("guardia de entrada", () => {
  it("vuelve al paso 1 si no hay fecha ni hora elegidas", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <SummaryPage />
      </BookingProvider>,
    );

    expect(replace).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book`);
  });
});

describe("camino feliz", () => {
  it("confirma y navega a la pantalla de confirmación", async () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: "2025-09-14",
          time: "3:30 PM",
          seatsLeft: WAITLIST_THRESHOLD_SEATS + 5,
          paymentMethodId: "pm_visa_4242",
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    expect(push).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book/confirmed`);
  });
});

describe("chequeo final — slot completo", () => {
  it("abre la waitlist en vez de confirmar", async () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: "2025-09-14",
          time: "3:30 PM",
          seatsLeft: WAITLIST_THRESHOLD_SEATS,
          paymentMethodId: "pm_visa_4242",
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    expect(screen.getByText("That slot just filled up")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("chequeo final — pago rechazado", () => {
  it("abre el error de pago en vez de confirmar", async () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: "2025-09-14",
          time: "3:30 PM",
          seatsLeft: WAITLIST_THRESHOLD_SEATS + 5,
          paymentMethodId: "pm_mc_8801",
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    expect(screen.getByText("We could not take the payment")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("visita cubierta por la membresía", () => {
  it("confirma sin exigir un método de pago", async () => {
    render(
      <BookingProvider
        lounge={ainsworth}
        covered
        initialDraft={{
          dateIso: "2025-09-14",
          time: "3:30 PM",
          seatsLeft: WAITLIST_THRESHOLD_SEATS + 5,
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    expect(push).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book/confirmed`);
  });
});
