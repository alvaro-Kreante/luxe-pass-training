import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TodayDashboard } from "@/components/partner/today-dashboard";

import PartnerTodayPage from "./page";

/**
 * Story 7.1 — Daily Guest Management. Story 7.2 — Booking Notifications for
 * Partners (real-time updates y sus alertas). Criterios en
 * docs/specs/epic-7-partner-dashboard/story-7.1-daily-guest-management.md
 * y story-7.2-booking-notifications-for-partners.md
 *
 * Los tests de actualización en vivo pasan `liveBookingDelayMs`/
 * `cancellationDelayMs` muy cortos y esperan con timers reales — combinar
 * fake timers con el scheduler de React bajo jsdom se cuelga (ver el
 * comentario de `TodayDashboard` en `./page.tsx`).
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner",
}));

describe("Today's guest list (Main.dc.html)", () => {
  it("muestra nombre, contacto y número LP de cada invitado", () => {
    render(<PartnerTodayPage />);

    expect(screen.getByText("Theo Lindqvist")).toBeVisible();
    expect(screen.getByText("theo.lindqvist@example.com")).toBeVisible();
    expect(screen.getByText("+1 (555) 214-9930")).toBeVisible();
    expect(screen.getByText("LP-840107")).toBeVisible();
  });

  it("resume el día: esperados, llegados, pendientes y no-show", () => {
    render(<PartnerTodayPage />);

    expect(screen.getByText("14 expected today")).toBeVisible();
    expect(screen.getByText("10 checked in")).toBeVisible();
    expect(screen.getByText("3 still to arrive")).toBeVisible();
    expect(screen.getByText("1 no-show")).toBeVisible();
  });
});

describe("check-in status tracking", () => {
  it("marcar la casilla de un pendiente lo pasa a llegado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.click(screen.getByRole("button", { name: "Mark Idris Fontaine as arrived" }));

    expect(screen.getByText("11 checked in")).toBeVisible();
    expect(screen.getByText("2 still to arrive")).toBeVisible();
  });
});

describe("no-show reporting", () => {
  it("abre la ficha del invitado y reporta un no-show desde ahí", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.click(screen.getByRole("button", { name: "View details for Idris Fontaine" }));
    await user.click(screen.getByRole("button", { name: "No-show" }));
    await user.click(screen.getByRole("button", { name: "Report no-show" }));

    expect(screen.getByText("2 no-show")).toBeVisible();
  });
});

describe("search/filter guests", () => {
  it("filtra la lista por nombre", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.type(screen.getByLabelText("Search by name or LP number"), "theo");

    expect(screen.getByText("Theo Lindqvist")).toBeVisible();
    expect(screen.queryByText("Camille Duforest")).not.toBeInTheDocument();
  });
});

describe("print-friendly / CSV export", () => {
  it("Export CSV abre el panel con el recuento filtrado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.type(screen.getByLabelText("Search by name or LP number"), "theo");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(screen.getByText(/1 guest · matching the filters on screen/)).toBeVisible();
  });
});

describe("real-time updates (LiveUpdate.dc.html)", () => {
  it("una reserva nueva sube el recuento, muestra un toast y resalta la fila", async () => {
    render(<TodayDashboard liveBookingDelayMs={5} cancellationDelayMs={100000} />);

    await waitFor(() => expect(screen.getByText("15 expected today")).toBeVisible());
    expect(screen.getByText("New booking just came in")).toBeVisible();
    expect(screen.getByText("Naomi Feldstein")).toBeVisible();
  });

  it("la notificación enlaza al email de la reserva nueva", async () => {
    const user = userEvent.setup({ delay: null });
    render(<TodayDashboard liveBookingDelayMs={5} cancellationDelayMs={100000} />);

    await waitFor(() => expect(screen.getByText("15 expected today")).toBeVisible());
    await user.click(screen.getByRole("button", { name: /unread/ }));

    expect(screen.getByRole("link", { name: "View email" })).toHaveAttribute(
      "href",
      "/partner/emails/new-booking",
    );
  });
});

describe("cancellation + waitlist promotion (Story 7.2)", () => {
  it("una cancelación libera el hueco y la waitlist lo ocupa automáticamente", async () => {
    render(<TodayDashboard liveBookingDelayMs={5} cancellationDelayMs={5} />);

    await waitFor(() => expect(screen.getByText("Victor Almeida")).toBeVisible());
    expect(screen.getByText("15 expected today")).toBeVisible();
  });
});
