import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { bookingReferenceFromId, confirmBooking, joinWaitlist } from "@/lib/booking";
import { today, addDays } from "@/lib/availability";
import { fetchVisitsThisMonth } from "@/lib/membership";
import { LATE_CANCELLATION_FEE_LABEL } from "@/lib/passes";
import { checkInReceptionBooking, reportReceptionNoShow } from "@/lib/reception";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import MyPassPage from "./page";

/**
 * Story 5.1 (Digital Pass Generation) — "Information available from My
 * Bookings section", extendida por la Story 6.1 (Booking Management):
 * estados de reserva, cancelar con la política de 24 horas y el historial.
 * `Main.dc.html` (Upcoming), `Cancel.dc.html` / `CancelFee.dc.html` y
 * `History.dc.html` (Past) de la Fase 7.
 *
 * Backend real (Supabase local): cada escenario (in-progress, confirmada a
 * más/menos de 24h, waitlisted, no-show) se construye con una reserva real
 * antes de renderizar — ver `docs/design/COMPONENT-MAP.md` "Backend real —
 * Epic 5". Cancelar ya escribe en Supabase de verdad (RPC `cancel_booking`,
 * Story 6.1 conectada) — los escenarios que confirman la cancelación usan su
 * propia reserva, nunca una que otro test de este archivo siga necesitando.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/my-pass",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `my-pass-page-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
    { membership: "annual" },
  );
  const kiosk = createClient();

  // In progress: check-in ya hecho hoy.
  const inProgress = await confirmBooking(supabase, {
    loungeId: "the-ainsworth",
    dateIso: today(),
    band: "morning",
    time: "8:00 AM",
    specialRequests: "",
  });
  if (!inProgress) throw new Error("No se pudo confirmar la reserva in-progress de prueba");
  await checkInReceptionBooking(kiosk, "the-ainsworth", today(), bookingReferenceFromId(inProgress.id));

  // Confirmada, dentro de las 24 horas (hoy mismo) — tarifa de cancelación.
  const withinWindow = await confirmBooking(supabase, {
    loungeId: "belmont-terrace",
    dateIso: today(),
    band: "afternoon",
    time: "1:00 PM",
    specialRequests: "",
  });
  if (!withinWindow) throw new Error("No se pudo confirmar la reserva 'dentro de 24h' de prueba");

  // Confirmada, más de 24 horas por delante — cancelación gratuita.
  const free = await confirmBooking(supabase, {
    loungeId: "aurelia-house",
    dateIso: addDays(today(), 3),
    band: "morning",
    time: "8:00 AM",
    specialRequests: "",
  });
  if (!free) throw new Error("No se pudo confirmar la reserva 'a más de 24h' de prueba");

  // En lista de espera.
  await joinWaitlist(supabase, {
    loungeId: "the-winslow-club",
    dateIso: addDays(today(), 5),
    band: "evening",
    time: "6:00 PM",
    specialRequests: "",
  });

  // Pasada, no-show.
  const noShowBooking = await confirmBooking(supabase, {
    loungeId: "the-meridian-salon",
    dateIso: today(),
    band: "afternoon",
    time: "3:30 PM",
    specialRequests: "",
  });
  if (!noShowBooking) throw new Error("No se pudo confirmar la reserva de no-show de prueba");
  await reportReceptionNoShow(kiosk, "the-meridian-salon", today(), bookingReferenceFromId(noShowBooking.id));
});

describe("campana de notificaciones", () => {
  it("está disponible desde My Pass, como fija Main.dc.html", async () => {
    render(<MyPassPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument(),
    );
  });
});

describe("Visits this month (Story 9.1, conectada en Epic 9)", () => {
  it("cuenta las visitas reales de membresía del mes, no un número de muestra", async () => {
    const visits = await fetchVisitsThisMonth(createClient());
    render(<MyPassPage />);

    const rail = await screen.findByText("Visits this month");
    await waitFor(() =>
      expect(within(rail.parentElement!).getByText(`${visits.used} of ${visits.included}`)).toBeInTheDocument(),
    );
    expect(visits.used).toBeGreaterThan(0);
  });
});

describe("pestaña Upcoming (por defecto)", () => {
  it("distingue los estados de una reserva: in progress, confirmed y waitlisted", async () => {
    render(<MyPassPage />);

    await waitFor(() => expect(screen.getByText("In progress")).toBeInTheDocument());
    expect(screen.getAllByText("Confirmed").length).toBe(2);
    expect(screen.getByText("Waitlisted")).toBeInTheDocument();
  });

  it("enlaza al pase digital de una reserva confirmada", async () => {
    render(<MyPassPage />);

    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /view pass/i }).length).toBeGreaterThan(0),
    );
  });

  it("no ofrece cancelar una reserva en progreso — ya se hizo el check-in", async () => {
    render(<MyPassPage />);

    const row = await screen.findByRole("heading", { name: "The Ainsworth", level: 2 });
    const li = row.closest("li") as HTMLElement;
    expect(within(li).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});

describe("cancelar una reserva con más de 24 horas de antelación", () => {
  it("abre el diálogo de cancelación gratuita y, al confirmar, la quita de Upcoming", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const heading = await screen.findByRole("heading", { name: "Aurelia House", level: 2 });
    const row = heading.closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Cancel this visit?" })).toBeInTheDocument();
    expect(screen.queryByText(LATE_CANCELLATION_FEE_LABEL)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel booking" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Aurelia House", level: 2 })).not.toBeInTheDocument(),
    );
  });
});

describe("cancelar una reserva dentro de las 24 horas", () => {
  it("abre el diálogo con la tarifa plana y, al confirmar, cobra la tarifa y la quita de Upcoming", async () => {
    const supabase = createClient();
    const paid = await confirmBooking(supabase, {
      loungeId: "rue-lafayette-club",
      dateIso: today(),
      band: "morning",
      time: "10:30 AM",
      specialRequests: "",
    });
    if (!paid) throw new Error("No se pudo confirmar la reserva 'Rue Lafayette Club' de prueba");

    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const heading = await screen.findByRole("heading", { name: "Rue Lafayette Club", level: 2 });
    const row = heading.closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("heading", { name: "Cancelling within 24 hours" })).toBeInTheDocument();
    expect(screen.getAllByText(LATE_CANCELLATION_FEE_LABEL).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: `Cancel and pay ${LATE_CANCELLATION_FEE_LABEL}` }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Rue Lafayette Club", level: 2 })).not.toBeInTheDocument(),
    );
  });

  it("mantiene la reserva si el miembro decide no cancelar", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const heading = await screen.findByRole("heading", { name: "Belmont Terrace", level: 2 });
    const row = heading.closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Keep booking" }));

    expect(screen.getByRole("heading", { name: "Belmont Terrace", level: 2 })).toBeInTheDocument();
  });
});

describe("dejar la lista de espera", () => {
  it("AC 'Modification options: Cancel' — 'Leave' cancela la reserva en waitlist de verdad", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    const heading = await screen.findByRole("heading", { name: "The Winslow Club", level: 2 });
    const row = heading.closest("li") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: "Leave" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "The Winslow Club", level: 2 })).not.toBeInTheDocument(),
    );
  });
});

describe("pestaña Past", () => {
  it("AC 'No-show tracking for booking history' — muestra el historial y explica el no-show", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    await screen.findByText("In progress");
    await user.click(screen.getByRole("tab", { name: /past/i }));

    expect(screen.getByRole("tab", { name: /past/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("The Meridian Salon")).toBeInTheDocument();
    expect(screen.getByText(/booking window closed without a check-in/i)).toBeInTheDocument();
  });

  it("filtra el historial por estado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<MyPassPage />);

    await screen.findByText("In progress");
    await user.click(screen.getByRole("tab", { name: /past/i }));
    await screen.findByText("The Meridian Salon");

    await user.click(screen.getByRole("button", { name: /^completed/i }));

    expect(screen.queryByText("The Meridian Salon")).not.toBeInTheDocument();
  });
});
