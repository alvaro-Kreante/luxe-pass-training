import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BookingProvider } from "@/components/booking/booking-context";
import { LOUNGES } from "@/lib/lounges";

import ConfirmedPage from "./page";

/**
 * Story 4.1 — pantalla de confirmación inmediata (`Confirmed.dc.html`).
 * Story 4.3 — el botón "Add to calendar" abre `Calendar.dc.html`.
 */
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/lounges/the-ainsworth/book/confirmed",
}));

vi.mock("@/lib/calendar-export", () => ({
  buildGoogleCalendarUrl: vi.fn(() => "https://calendar.google.com/calendar/render?mock=1"),
  buildIcs: vi.fn(() => "BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
  downloadIcsFile: vi.fn(),
}));

beforeEach(() => {
  replace.mockClear();
});

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

describe("guardia de entrada", () => {
  it("vuelve al paso 1 si no hay una reserva confirmada en el borrador", () => {
    render(
      <BookingProvider lounge={ainsworth} covered={false}>
        <ConfirmedPage />
      </BookingProvider>,
    );

    expect(replace).toHaveBeenCalledWith(`/lounges/${ainsworth.id}/book`);
  });
});

describe("con una reserva confirmada", () => {
  function renderConfirmed() {
    return render(
      <BookingProvider
        lounge={ainsworth}
        covered={false}
        initialDraft={{ dateIso: "2025-09-14", time: "3:30 PM" }}
      >
        <ConfirmedPage />
      </BookingProvider>,
    );
  }

  it("muestra el título de confirmación y la tarjeta oscura con el número de reserva", () => {
    renderConfirmed();

    expect(screen.getByText("Your visit is confirmed")).toBeInTheDocument();
    expect(screen.getByText(/^LP-\d{6}$/)).toBeInTheDocument();
  });

  it("'Add to calendar' abre el modal de la Story 4.3", async () => {
    const user = userEvent.setup({ delay: null });
    renderConfirmed();

    await user.click(screen.getByRole("button", { name: "Add to calendar" }));

    expect(screen.getByText("Add to your calendar")).toBeInTheDocument();
  });

  it("'View in My Pass' enlaza a My Pass", () => {
    renderConfirmed();

    expect(screen.getByRole("link", { name: "View in My Pass" })).toHaveAttribute(
      "href",
      "/my-pass",
    );
  });

  it("'view the email receipt' enlaza al recibo por email de la Story 4.2", () => {
    renderConfirmed();

    expect(screen.getByRole("link", { name: "view the email receipt" })).toHaveAttribute(
      "href",
      `/lounges/${ainsworth.id}/book/receipt`,
    );
  });
});
