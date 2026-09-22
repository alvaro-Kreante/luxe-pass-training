import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { bookingReferenceFromId, confirmBooking } from "@/lib/booking";
import { TODAY } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import ReceptionPage from "./page";

/**
 * Story 5.2 (Lounge Check-In Process) — "Instant verification of booking
 * validity" y "Emergency contact information accessible to staff".
 * `Reception.dc.html` (válido) y `CheckInError.dc.html` (no encontrado) son
 * dos estados de la misma consola: se alcanzan tecleando el número, no por
 * query param, porque es una interacción real del usuario.
 *
 * Backend real (Supabase local): la consola no inicia sesión (RPC "de
 * kiosco", ver `src/lib/reception.ts`), así que cada test primero confirma
 * una reserva real de The Ainsworth para hoy con otro cliente (un miembro
 * con sesión) y luego la busca desde la consola sin sesión.
 */
let reference = "";
let memberName = "";

beforeAll(async () => {
  const member = createClient();
  await signUpConfirmedMemberAndSignIn(
    member,
    `reception-page-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
  );
  const {
    data: { user },
  } = await member.auth.getUser();
  memberName = "Test Member";

  await member
    .from("profiles")
    .update({
      emergency_contact_name: "Miriam Rivas",
      emergency_contact_relation: "sister",
      emergency_contact_phone: "+1 (555) 402-7788",
    })
    .eq("id", user!.id);

  const booking = await confirmBooking(member, {
    loungeId: "the-ainsworth",
    dateIso: TODAY,
    band: "morning",
    time: "8:00 AM",
    specialRequests: "",
  });
  if (!booking) throw new Error("No se pudo confirmar la reserva de prueba");

  reference = bookingReferenceFromId(booking.id);
});

async function lookUp(user: ReturnType<typeof userEvent.setup>, code: string) {
  const field = screen.getByRole("textbox", { name: /confirmation number/i });
  await user.clear(field);
  await user.type(field, code);
  await user.click(screen.getByRole("button", { name: /look up|try again/i }));
}

describe("al buscar una reserva válida de hoy", () => {
  it("AC 'Instant verification of booking validity' + 'Emergency contact information accessible to staff'", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReceptionPage />);

    await lookUp(user, reference);

    await waitFor(() => expect(screen.getByRole("heading", { name: memberName })).toBeInTheDocument());
    expect(screen.getByText("Valid booking")).toBeInTheDocument();
    expect(screen.getByText(/miriam rivas/i)).toBeInTheDocument();
  });
});

describe("al buscar un número que no existe hoy", () => {
  it("bloquea el check-in y ofrece las coincidencias cercanas", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReceptionPage />);

    await lookUp(user, "LP-000000");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "No booking matches this code" })).toBeInTheDocument(),
    );
    expect(screen.getByText("Check-in blocked")).toBeInTheDocument();
    expect(screen.getByText(/marcus vidal/i)).toBeInTheDocument();
  });
});

describe("al confirmar el check-in", () => {
  it("AC 'Check-in confirmation to member's app' — marca la reserva como ya recibida", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ReceptionPage />);

    await lookUp(user, reference);
    await waitFor(() => expect(screen.getByRole("heading", { name: memberName })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /check in/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /checked in/i })).toBeDisabled());
  });
});
