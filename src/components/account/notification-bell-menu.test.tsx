import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NOTIFICATIONS, unreadNotificationCount } from "@/lib/notifications";

import { NotificationBellMenu } from "./notification-bell-menu";

/**
 * Story 6.2 — "Booking confirmation notification" y el resto de tipos, más
 * el "panel desplegable de la campana con el aviso recién llegado" que fija
 * DESIGN-SYSTEM.md §5 patrón 14.
 */
describe("campana de notificaciones", () => {
  it("muestra cuántas notificaciones hay sin leer", () => {
    render(<NotificationBellMenu />);

    const unread = unreadNotificationCount(NOTIFICATIONS);
    expect(screen.getByRole("button", { name: new RegExp(`${unread} unread`) })).toBeInTheDocument();
  });

  it("al abrirse, enseña las notificaciones y un enlace al centro completo", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationBellMenu />);

    await user.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText(NOTIFICATIONS[0].title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all notifications/i })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("marcar todo como leído quita el contador de no leídas", async () => {
    const user = userEvent.setup({ delay: null });
    render(<NotificationBellMenu />);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(screen.getByRole("button", { name: /mark all as read/i }));

    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});
