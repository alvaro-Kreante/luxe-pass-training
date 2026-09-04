import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import { monthCalendar, startOfMonth } from "@/lib/booking";
import { TODAY } from "@/lib/availability";
import { LOUNGES } from "@/lib/lounges";

import BookPage from "./page";

/**
 * Story 4.1 — Seamless Booking Flow, paso 1 "Visit details" (`Main.dc.html`).
 */
const params = vi.fn(() => ({ id: "the-ainsworth" }));

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  usePathname: () => "/lounges/the-ainsworth/book",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeEach(() => {
  params.mockReturnValue({ id: "the-ainsworth" });
});

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
const futureDate = monthCalendar(ainsworth, startOfMonth(TODAY)).find(
  (day) => day.status === "open" && day.dateIso > TODAY,
)!.dateIso;

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

    await user.click(screen.getByRole("button", { name: String(Number(futureDate.slice(-2))) }));
    const openSlot = screen
      .getAllByRole("button")
      .find((button) => /^\d{1,2}:\d{2} (AM|PM) ·/.test(button.getAttribute("aria-label") ?? ""));
    await user.click(openSlot!);

    expect(
      screen.getByRole("link", { name: "Choose payment method" }),
    ).toHaveAttribute("href", "/lounges/the-ainsworth/book/payment");
  });
});
