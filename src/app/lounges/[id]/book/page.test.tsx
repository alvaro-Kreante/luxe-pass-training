import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import type { LoungeProfile } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";
import { fetchAinsworthProfile, findPredictedSlot } from "@/lib/testing/lounge-fixture";

import BookPage from "./page";

/**
 * Story 4.1 — Seamless Booking Flow, paso 1 "Visit details" (`Main.dc.html`).
 */
const params = vi.fn(() => ({ id: "the-ainsworth" }));

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  usePathname: () => "/lounges/the-ainsworth/book",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
});

const ainsworthMock = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const futureDate = findPredictedSlot(ainsworthMock, "available").dateIso;
let ainsworth: LoungeProfile;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedAndSignIn(
    supabase,
    `book-page-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
  );
  ainsworth = await fetchAinsworthProfile(supabase);
});

function renderPage(covered = false) {
  return render(
    <BookingProvider lounge={ainsworth} covered={covered}>
      <BookPage />
    </BookingProvider>,
  );
}

describe("paso 1 · visit details", () => {
  it("muestra el lounge y el progreso del paso 1 de 3", () => {
    renderPage();

    expect(screen.getAllByText("The Ainsworth").length).toBeGreaterThan(0);
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
  });

  it("el botón de avance solo se habilita tras elegir fecha y hora", async () => {
    const user = userEvent.setup({ delay: null });
    renderPage();

    expect(
      screen.getByRole("button", { name: "Choose payment method" }),
    ).toBeDisabled();

    const dayButton = await screen.findByRole("button", {
      name: String(Number(futureDate.slice(-2))),
    });
    await user.click(dayButton);
    const openSlot = await vi.waitFor(() => {
      const slot = screen
        .getAllByRole("button")
        .find((button) => /^\d{1,2}:\d{2} (AM|PM) ·/.test(button.getAttribute("aria-label") ?? ""));
      if (!slot) throw new Error("no open slot rendered yet");
      return slot;
    });
    await user.click(openSlot);

    expect(
      screen.getByRole("link", { name: "Choose payment method" }),
    ).toHaveAttribute("href", "/lounges/the-ainsworth/book/payment");
  });
});
