import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActivityPanel } from "./activity-panel";
import { LIVE_BOOKING_ACTIVITY, PARTNER_ACTIVITY } from "@/lib/partner";

/**
 * Story 7.1 — "real-time updates when new bookings are made". Artboard:
 * LiveUpdate.dc.html (panel de actividad).
 */
describe("panel de actividad", () => {
  it("muestra el recuento de no leídas en la campana", () => {
    render(<ActivityPanel items={PARTNER_ACTIVITY} onMarkAllRead={vi.fn()} onMarkRead={vi.fn()} />);

    expect(screen.getByRole("button", { name: /2 unread/ })).toBeInTheDocument();
  });

  it("abre y lista la actividad reciente con un enlace al email de la reserva nueva", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <ActivityPanel
        items={[LIVE_BOOKING_ACTIVITY, ...PARTNER_ACTIVITY]}
        onMarkAllRead={vi.fn()}
        onMarkRead={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /unread/ }));

    expect(screen.getByText(/Naomi Feldstein booked 7:00 PM/)).toBeVisible();
    expect(screen.getByRole("link", { name: "View email" })).toHaveAttribute(
      "href",
      "/partner/emails/new-booking",
    );
  });

  it('"Mark all as read" llama a onMarkAllRead', async () => {
    const user = userEvent.setup({ delay: null });
    const onMarkAllRead = vi.fn();
    render(<ActivityPanel items={PARTNER_ACTIVITY} onMarkAllRead={onMarkAllRead} onMarkRead={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /unread/ }));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });
});
