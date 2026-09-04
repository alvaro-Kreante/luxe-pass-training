import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NOTIFICATIONS } from "@/lib/notifications";

import NotificationsPage from "./page";

/**
 * Story 6.2 — centro de notificaciones completo (`Notifications.dc.html`).
 */
const back = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/notifications",
  useRouter: () => ({ back }),
}));

describe("centro de notificaciones", () => {
  it("muestra todas las notificaciones de muestra", () => {
    render(<NotificationsPage />);

    for (const item of NOTIFICATIONS) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it("filtra por categoría desde el rail", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationsPage />);

    await user.click(screen.getByRole("button", { name: "Lounges" }));

    const lounge = NOTIFICATIONS.find((item) => item.category === "lounges");
    const bookingOnly = NOTIFICATIONS.find((item) => item.category === "bookings");
    expect(screen.getByText(lounge!.title)).toBeInTheDocument();
    expect(screen.queryByText(bookingOnly!.title)).not.toBeInTheDocument();
  });

  it("enlaza a los ajustes de notificaciones", () => {
    render(<NotificationsPage />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/profile/notifications",
    );
  });

  it("ofrece una forma de salir a la pantalla anterior", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationsPage />);

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(back).toHaveBeenCalledOnce();
  });

  it("el aviso matinal ofrece ver el pase y las indicaciones", () => {
    render(<NotificationsPage />);

    const morning = NOTIFICATIONS.find((item) => item.showBookingActions)!;
    const row = screen.getByRole("group", { name: `${morning.title}, unread` });

    expect(screen.getByRole("button", { name: "View pass" })).toBeInTheDocument();
    expect(row).toHaveTextContent("Directions");
  });

  it("un enlace secundario como 'View lounge' se muestra cuando la notificación lo trae", () => {
    render(<NotificationsPage />);

    const withLink = NOTIFICATIONS.find((item) => item.linkLabel === "View lounge")!;
    const row = screen.getByRole("group", { name: `${withLink.title}, read` });

    expect(row).toHaveTextContent("View lounge");
  });
});

describe("marcar una notificación como leída", () => {
  it("al hacer clic, pasa a leída y no vuelve a marcarse como no leída", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationsPage />);

    const unread = NOTIFICATIONS.find((item) => !item.read)!;
    const row = screen.getByRole("group", { name: `${unread.title}, unread` });

    await user.click(row);

    expect(screen.getByRole("group", { name: `${unread.title}, read` })).toBeInTheDocument();

    await user.click(screen.getByRole("group", { name: `${unread.title}, read` }));

    expect(screen.getByRole("group", { name: `${unread.title}, read` })).toBeInTheDocument();
  });
});
