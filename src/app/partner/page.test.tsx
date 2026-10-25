import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { bookingReferenceFromId, confirmBooking } from "@/lib/booking";
import { addDays, today } from "@/lib/availability";
import type { WeekBandId } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import {
  signUpConfirmedMemberAndSignIn,
  signUpConfirmedPartnerAndSignIn,
} from "@/lib/testing/confirmed-user";

import PartnerTodayPage from "./page";
import { findDialog } from "@/lib/testing/find-dialog";
import { OPEN_EVERY_DAY_LOUNGE } from "@/lib/testing/lounge-fixture";

/**
 * Story 7.1 — Daily Guest Management. Story 7.2 — Booking Notifications for
 * Partners (real-time updates). Criterios en
 * docs/specs/epic-7-partner-dashboard/story-7.1-daily-guest-management.md
 * y story-7.2-booking-notifications-for-partners.md
 *
 * Backend real (22 sept 2026): cada guest de prueba es una reserva real
 * confirmada contra Supabase local (`confirmBooking`, mismo helper que
 * `/reception`) para Verandah No. 9 (`OPEN_EVERY_DAY_LOUNGE`) en `TODAY` — el mismo "hoy" fijo de
 * mockup que usa el resto del proyecto (`src/lib/availability.ts`), no el
 * reloj real. Como la lista del día acumula reservas de ejecuciones
 * anteriores de esta suite (no hay `supabase db reset` entre corridas), los
 * asserts nunca comprueban el recuento total absoluto — cada guest tiene un
 * nombre único (con `Date.now()`) para que sus propios botones
 * ("Mark X as arrived", "View details for X") no sean ambiguos frente a
 * corridas previas.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner",
  useRouter: () => ({ replace: vi.fn() }),
}));

interface TestGuest {
  name: string;
  email: string;
  reference: string;
}

async function createTestGuest(name: string, band: WeekBandId, slotTime: string, dateIso = today()): Promise<TestGuest> {
  const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@ensoleil-test.example`;
  const member = createClient();
  await signUpConfirmedMemberAndSignIn(member, email, "EnSoleil!2026", { membership: "annual" });

  const {
    data: { user },
  } = await member.auth.getUser();
  await member.from("profiles").update({ full_name: name }).eq("id", user!.id);

  const booking = await confirmBooking(member, {
    loungeId: OPEN_EVERY_DAY_LOUNGE,
    dateIso,
    band,
    time: slotTime,
    specialRequests: "",
  });
  if (!booking) throw new Error(`No se pudo confirmar la reserva de prueba para ${name}`);

  await member.auth.signOut();

  return { name, email, reference: bookingReferenceFromId(booking.id) };
}

let guestShow: TestGuest;
let guestCheckIn: TestGuest;
let guestNoShow: TestGuest;
let guestSearchA: TestGuest;
let guestSearchB: TestGuest;
let guestTomorrow: TestGuest;
let guestUndoCheckIn: TestGuest;
let guestUndoNoShow: TestGuest;

beforeAll(async () => {
  const stamp = Date.now();

  const partner = createClient();
  await signUpConfirmedPartnerAndSignIn(
    partner,
    `partner-today-${stamp}@verandah-test.example`,
    "VerandahFOH!24",
    { businessName: "Verandah No. 9", loungeIds: [OPEN_EVERY_DAY_LOUNGE] },
  );
  await partner.auth.signOut();

  // Secuencial, no Promise.all: los clientes de Supabase de este proyecto
  // comparten storage key en jsdom (una sola "ventana" por archivo de test)
  // — firmar sesiones en paralelo pisa el token de sesión de las demás y
  // rompe RLS a mitad de camino.
  // `afternoon`/`late`: los únicos dos bands con plazas libres en el Docker
  // local de esta rama (`morning` se agotó, `evening` solo tiene 1) — ver
  // `scripts/check-seats.mjs` (herramienta puntual de esta sesión, no forma
  // parte del proyecto).
  guestShow = await createTestGuest(`Guest Show ${stamp}`, "afternoon", "1:00 PM");
  guestCheckIn = await createTestGuest(`Guest CheckIn ${stamp}`, "afternoon", "3:30 PM");
  guestNoShow = await createTestGuest(`Guest NoShow ${stamp}`, "late", "6:00 PM");
  guestSearchA = await createTestGuest(`Guest SearchA ${stamp}`, "late", "6:00 PM");
  guestSearchB = await createTestGuest(`Guest SearchB ${stamp}`, "late", "6:00 PM");
  guestTomorrow = await createTestGuest(`Guest Tomorrow ${stamp}`, "afternoon", "1:00 PM", addDays(today(), 1));
  guestUndoCheckIn = await createTestGuest(`Guest UndoCheckIn ${stamp}`, "afternoon", "3:30 PM");
  guestUndoNoShow = await createTestGuest(`Guest UndoNoShow ${stamp}`, "late", "6:00 PM");

  const partnerSession = createClient();
  await partnerSession.auth.signInWithPassword({
    email: `partner-today-${stamp}@verandah-test.example`,
    password: "VerandahFOH!24",
  });
});

describe("Today's guest list (Main.dc.html)", () => {
  it("muestra nombre, contacto y número LP de un invitado real", async () => {
    render(<PartnerTodayPage />);

    await waitFor(() => expect(screen.getByText(guestShow.name)).toBeVisible());
    expect(screen.getByText(guestShow.email)).toBeVisible();
    // El teléfono es el mismo fijo para todos los miembros de prueba
    // (`signUpConfirmedMemberAndSignIn`) — solo se comprueba que aparece,
    // no que sea único.
    expect(screen.getAllByText("+15555550100").length).toBeGreaterThan(0);
    expect(screen.getByText(guestShow.reference)).toBeVisible();
  });
});

describe("check-in status tracking", () => {
  it("marcar la casilla de un pendiente lo pasa a llegado de verdad (RPC partner_checkin_booking)", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    const markButton = await screen.findByRole("button", {
      name: `Mark ${guestCheckIn.name} as arrived`,
    });
    await user.click(markButton);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: `Mark ${guestCheckIn.name} as arrived` }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("no-show reporting", () => {
  it("abre la ficha del invitado y reporta un no-show real (RPC partner_report_no_show)", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.click(await screen.findByRole("button", { name: `View details for ${guestNoShow.name}` }));
    await user.click(screen.getByRole("button", { name: "No-show" }));
    await user.click(screen.getByRole("button", { name: "Report no-show" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: `Mark ${guestNoShow.name} as arrived` }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("abrir la ficha desde la fila (ticket 002)", () => {
  it("un clic en cualquier parte de la fila abre la ficha del invitado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    const view = await screen.findByRole("button", { name: `View ${guestSearchA.name}` });
    await user.click(within(view.parentElement!).getByText(guestSearchA.email));

    expect(await findDialog()).toHaveTextContent(guestSearchA.name);
  });
});

describe("search/filter guests", () => {
  it("filtra la lista por nombre", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await screen.findByText(guestSearchA.name);
    await user.type(screen.getByLabelText("Search by name or LP number"), guestSearchA.name);

    expect(screen.getByText(guestSearchA.name)).toBeVisible();
    expect(screen.queryByText(guestSearchB.name)).not.toBeInTheDocument();
  });
});

describe("corregir un error de hoy", () => {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  async function bookingOf(reference: string) {
    const { data } = await admin
      .from("bookings")
      .select("id, status, no_show, checked_in_at, cancellation_fee_cents")
      .eq("confirmation_code", reference)
      .single();
    return data!;
  }

  it("deshace un check-in y el invitado vuelve a estar pendiente", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.click(await screen.findByRole("button", { name: `Mark ${guestUndoCheckIn.name} as arrived` }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: `Mark ${guestUndoCheckIn.name} as arrived` })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: `View details for ${guestUndoCheckIn.name}` }));
    await user.click(await screen.findByRole("button", { name: "Undo check-in" }));

    expect(await screen.findByRole("button", { name: `Mark ${guestUndoCheckIn.name} as arrived` })).toBeInTheDocument();
    const booking = await bookingOf(guestUndoCheckIn.reference);
    expect(booking.status).toBe("confirmed");
    expect(booking.checked_in_at).toBeNull();
  });

  it("deshace un no-show: borra el fee y lo anota en el caso de soporte", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await user.click(await screen.findByRole("button", { name: `View details for ${guestUndoNoShow.name}` }));
    await user.click(screen.getByRole("button", { name: "No-show" }));
    await user.click(screen.getByRole("button", { name: "Report no-show" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: `Mark ${guestUndoNoShow.name} as arrived` })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: `View details for ${guestUndoNoShow.name}` }));
    await user.click(await screen.findByRole("button", { name: "Undo no-show" }));

    expect(await screen.findByRole("button", { name: `Mark ${guestUndoNoShow.name} as arrived` })).toBeInTheDocument();
    const booking = await bookingOf(guestUndoNoShow.reference);
    expect(booking.no_show).toBe(false);
    expect(booking.cancellation_fee_cents).toBeNull();
    const { data: tickets } = await admin
      .from("support_tickets")
      .select("support_ticket_messages(body)")
      .eq("booking_id", booking.id);
    const bodies = (tickets ?? []).flatMap((t) => (t.support_ticket_messages as { body: string }[]).map((m) => m.body));
    expect(bodies.some((body) => /undid the no-show/.test(body))).toBe(true);
  });
});

describe("search/filter guests by date", () => {
  it("el día siguiente enseña sus invitados, de solo lectura", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await screen.findByText(guestShow.name);
    await user.click(screen.getByRole("button", { name: "Next day" }));

    expect(await screen.findByText(guestTomorrow.name)).toBeVisible();
    expect(screen.queryByText(guestShow.name)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Mark ${guestTomorrow.name} as arrived` })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today's guests" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(await screen.findByText(guestShow.name)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Today's guests" })).toBeInTheDocument();
  });

  it("elige un día concreto en el calendario", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await screen.findByText(guestShow.name);
    const tomorrow = addDays(today(), 1);
    await user.click(screen.getByRole("button", { name: /Choose a date/ }));
    if (tomorrow.slice(0, 7) !== today().slice(0, 7)) await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: String(Number(tomorrow.slice(8))) }));

    expect(await screen.findByText(guestTomorrow.name)).toBeVisible();
  });
});

describe("print-friendly / CSV export", () => {
  it("Export CSV abre el panel con el recuento filtrado a un único invitado", async () => {
    const user = userEvent.setup({ delay: null });
    render(<PartnerTodayPage />);

    await screen.findByText(guestShow.name);
    await user.type(screen.getByLabelText("Search by name or LP number"), guestShow.reference);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(screen.getByText(/1 guest · matching the filters on screen/)).toBeVisible();
  });
});
