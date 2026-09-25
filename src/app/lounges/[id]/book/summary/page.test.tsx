import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile, findPredictedSlot } from "@/lib/testing/lounge-fixture";
import { grantTestMembership } from "@/lib/testing/membership-fixture";
import { attachTestCard } from "@/lib/testing/stripe-fixture";

import SummaryPage from "./page";

/**
 * Story 4.1 — paso 3 "Review and confirm" (`Summary.dc.html`), con las
 * ramas de `Waitlist.dc.html` y `PaymentError.dc.html` del chequeo final.
 *
 * Backend real: "confirma"/"waitlist"/"pago rechazado" corren contra el RPC
 * y Stripe reales (tarjeta guardada — `pm_card_visa` para el cargo que
 * funciona, `pm_card_visa_chargeDeclined` para el que declina). Requiere
 * `supabase functions serve --env-file supabase/functions/.env` corriendo
 * (ver `src/lib/stripe-payments.test.ts`).
 *
 * El camino de "tarjeta nueva" (`<PaymentElement>` real) no se prueba aquí:
 * Stripe.js no se puede montar en jsdom — se verifica con Playwright, igual
 * que el mapa real de Epic 2 (ver `docs/design/COMPONENT-MAP.md` "Backend
 * real — Epic 2").
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

const ainsworthMock = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
let ainsworth: LoungeProfile;
let workingCardId: string;

beforeAll(async () => {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `book-summary-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);

  const { listSavedPaymentMethods } = await import("@/lib/stripe-payments");
  await listSavedPaymentMethods(supabase);
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  workingCardId = await attachTestCard(profile!.stripe_customer_id as string);
  // Epic 9 — `confirm_booking` solo acepta una reserva sin pago si la cubre
  // la membresía real (`booking_coverage`); el camino "cubierta" lo necesita.
  await grantTestMembership(user.id, "annual");
});

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

describe("camino feliz — tarjeta guardada real", () => {
  it("confirma y navega a la pantalla de confirmación", async () => {
    const slot = findPredictedSlot(ainsworthMock, "available");

    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: slot.dateIso,
          time: slot.time,
          band: slot.band,
          paymentMethodId: workingCardId,
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    await vi.waitFor(
      () => expect(push).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book/confirmed`),
      { timeout: 10_000 },
    );
  }, 15_000);
});

describe("chequeo final — slot completo", () => {
  it("abre la waitlist en vez de confirmar", async () => {
    const slot = findPredictedSlot(ainsworthMock, "full");

    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: slot.dateIso,
          time: slot.time,
          band: slot.band,
          paymentMethodId: workingCardId,
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    await screen.findByText("That slot just filled up", {}, { timeout: 10_000 });
    expect(push).not.toHaveBeenCalled();
  }, 15_000);
});

describe("chequeo final — pago rechazado (Stripe real)", () => {
  it("abre el error de pago en vez de confirmar", async () => {
    const slot = findPredictedSlot(ainsworthMock, "available");

    render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{
          dateIso: slot.dateIso,
          time: slot.time,
          band: slot.band,
          paymentMethodId: "pm_card_visa_chargeDeclined",
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    await screen.findByText("We could not take the payment", {}, { timeout: 10_000 });
    expect(push).not.toHaveBeenCalled();
  }, 15_000);
});

describe("visita cubierta por la membresía", () => {
  it("confirma sin exigir un método de pago", async () => {
    // occurrence 2: "camino feliz" ya confirmó de verdad la 1ª — no pisarla.
    const slot = findPredictedSlot(ainsworthMock, "available", 2);

    render(
      <BookingProvider
        lounge={ainsworth}
        covered
        initialDraft={{
          dateIso: slot.dateIso,
          time: slot.time,
          band: slot.band,
        }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    await vi.waitFor(
      () => expect(push).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book/confirmed`),
      { timeout: 10_000 },
    );
  }, 15_000);
});

describe("el servidor manda sobre quién paga (Epic 9)", () => {
  it("si la visita ya no está cubierta al confirmar, lo dice en vez de quedarse colgada", async () => {
    // Un miembro SIN plan con la pantalla creyendo que la visita está
    // cubierta — p. ej. las 8 visitas se agotaron en otra pestaña.
    await signUpConfirmedMemberAndSignIn(
      createClient(),
      `book-summary-uncovered-${Date.now()}@ensoleil-test.com`,
      "EnSoleil!2026",
    );
    const slot = findPredictedSlot(ainsworthMock, "available", 3);

    render(
      <BookingProvider
        lounge={ainsworth}
        covered
        initialDraft={{ dateIso: slot.dateIso, time: slot.time, band: slot.band }}
      >
        <SummaryPage />
      </BookingProvider>,
    );

    await acceptTermsAndConfirm();

    const dialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    expect(within(dialog).getByText(/no longer covered/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  }, 15_000);
});
