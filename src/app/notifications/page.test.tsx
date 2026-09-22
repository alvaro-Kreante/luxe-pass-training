import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { confirmBooking } from "@/lib/booking";
import { TODAY } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import NotificationsPage from "./page";

/**
 * Story 6.2 — centro de notificaciones completo (`Notifications.dc.html`),
 * backend real: las cuatro notificaciones de muestra (nuevo lounge,
 * renovación, ofertas, cumpleaños) se siembran solas al crear el perfil
 * (ver `notifications.test.ts`). El aviso de las 6 AM depende de un cron con
 * ventana horaria real (`dispatch_morning_notifications`, no ejercitable de
 * punta a punta aquí, ver CLAUDE.md) — se sembra directo vía service role,
 * igual que `signUpConfirmedAndSignIn` usa la API de administración para lo
 * que el flujo normal no puede producir en un test.
 */
const back = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/notifications",
  useRouter: () => ({ back, replace }),
}));

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function seedMorningNotification(memberId: string) {
  const { error } = await adminClient()
    .from("notifications")
    .insert({
      member_id: memberId,
      category: "bookings",
      icon: "morning",
      title: "Your visit today at The Ainsworth",
      body: "Arrive at 8:00 AM. Your pass is LP-000000.",
    });
  if (error) throw error;
}

async function signUpFreshMember(label: string) {
  const supabase = createClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `notifications-page-${Date.now()}-${label}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  return { supabase, user };
}

describe("centro de notificaciones", () => {
  it("muestra todas las notificaciones de muestra sembradas al crear el perfil", async () => {
    await signUpFreshMember("seed");
    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByText("Your membership renews soon")).toBeInTheDocument());
    expect(screen.getByText(/^New lounge:/)).toBeInTheDocument();
    expect(screen.getByText("Members' hours this week")).toBeInTheDocument();
    expect(screen.getByText("Your birthday month is coming up")).toBeInTheDocument();
  });

  it("AC 'Booking confirmation notification' — filtra por categoría desde el rail", async () => {
    const { supabase } = await signUpFreshMember("filter");
    const booking = await confirmBooking(supabase, {
      loungeId: "sable-and-stone",
      dateIso: TODAY,
      band: "afternoon",
      time: "3:30 PM",
      specialRequests: "",
    });
    if (!booking) throw new Error("No se pudo confirmar la reserva de prueba");

    const user = userEvent.setup({ delay: null });
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByText(/^Booking confirmed/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Lounges" }));

    expect(screen.getByText(/^New lounge:/)).toBeInTheDocument();
    expect(screen.queryByText(/^Booking confirmed/)).not.toBeInTheDocument();
  });

  it("enlaza a los ajustes de notificaciones", async () => {
    await signUpFreshMember("settings-link");
    render(<NotificationsPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/profile/notifications"),
    );
  });

  it("ofrece una forma de salir a la pantalla anterior", async () => {
    await signUpFreshMember("back-button");
    const user = userEvent.setup({ delay: null });
    render(<NotificationsPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(back).toHaveBeenCalledOnce();
  });

  it("el aviso matinal ofrece ver el pase y las indicaciones", async () => {
    const { user } = await signUpFreshMember("morning");
    await seedMorningNotification(user.id);

    render(<NotificationsPage />);

    const row = await screen.findByRole("group", { name: "Your visit today at The Ainsworth, unread" });
    expect(within(row).getByRole("button", { name: "View pass" })).toBeInTheDocument();
    expect(row).toHaveTextContent("Directions");
  });

  it("un enlace secundario como 'View lounge' se muestra cuando la notificación lo trae", async () => {
    await signUpFreshMember("link-label");
    render(<NotificationsPage />);

    const heading = await screen.findByText(/^New lounge:/);
    const row = heading.closest('[role="group"]') as HTMLElement;

    expect(row).toHaveTextContent("View lounge");
  });
});

describe("marcar una notificación como leída", () => {
  it("al hacer clic, pasa a leída y no vuelve a marcarse como no leída", async () => {
    await signUpFreshMember("mark-read");
    const user = userEvent.setup({ delay: null });
    render(<NotificationsPage />);

    const row = await screen.findByRole("group", { name: "Your membership renews soon, unread" });
    await user.click(row);

    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Your membership renews soon, read" })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("group", { name: "Your membership renews soon, read" }));

    expect(screen.getByRole("group", { name: "Your membership renews soon, read" })).toBeInTheDocument();
  });
});
