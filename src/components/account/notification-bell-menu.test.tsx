import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { fetchNotifications, unreadNotificationCount } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { NotificationBellMenu } from "./notification-bell-menu";

/**
 * Story 6.2 — "Booking confirmation notification" y el resto de tipos, más
 * el "panel desplegable de la campana con el aviso recién llegado" que fija
 * DESIGN-SYSTEM.md §5 patrón 14. Backend real: las cuatro notificaciones de
 * muestra se siembran solas al crear el perfil (ver `notifications.test.ts`).
 */
async function signUpFreshMember(label: string) {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `bell-menu-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  return supabase;
}

describe("campana de notificaciones", () => {
  it("muestra cuántas notificaciones hay sin leer", async () => {
    const supabase = await signUpFreshMember("unread-count");
    const seeded = await fetchNotifications(supabase);
    const unread = unreadNotificationCount(seeded);

    render(<NotificationBellMenu />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(`${unread} unread`) })).toBeInTheDocument(),
    );
  });

  it("al abrirse, enseña las notificaciones y un enlace al centro completo", async () => {
    const supabase = await signUpFreshMember("open-panel");
    const seeded = await fetchNotifications(supabase);
    const user = userEvent.setup({ delay: null });

    render(<NotificationBellMenu />);
    await waitFor(() => expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText(seeded[0]!.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all notifications/i })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("marcar todo como leído quita el contador de no leídas", async () => {
    await signUpFreshMember("mark-all");
    const user = userEvent.setup({ delay: null });

    render(<NotificationBellMenu />);
    await waitFor(() => expect(screen.getByRole("button", { name: /\d+ unread/ })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    await user.click(screen.getByRole("button", { name: /mark all as read/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
  });
});
