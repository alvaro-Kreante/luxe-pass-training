import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { bookingReferenceFromId, confirmBooking } from "@/lib/booking";
import { today, addDays } from "@/lib/availability";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import ReminderPage from "./page";

/**
 * Story 5.3 — "receive an email 24 hrs before the booking time". El email
 * real ya lo manda `send-booking-reminder` (pg_cron, ver
 * `supabase/schemas/booking_reminders.sql`); esta pantalla sigue siendo
 * visual, pero ahora pinta una reserva real (ver cabecera de `./page.tsx`).
 */
let reference = "";
const replace = vi.fn();
const params = vi.fn(() => ({ reference }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useParams: () => params(),
}));

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `reminder-page-${Date.now()}@ensoleil-test.com`,
    "EnSoleil!2026",
    { membership: "annual" },
  );

  const booking = await confirmBooking(supabase, {
    loungeId: ainsworth.id,
    dateIso: addDays(today(), 1),
    band: "afternoon",
    time: "1:00 PM",
    specialRequests: "",
  });
  if (!booking) throw new Error("No se pudo confirmar la reserva de prueba");

  reference = bookingReferenceFromId(booking.id);
});

beforeEach(() => {
  replace.mockClear();
  params.mockReturnValue({ reference });
});

describe("guardia de entrada", () => {
  it("vuelve a My Pass si el número de confirmación no existe", async () => {
    params.mockReturnValue({ reference: "LP-000000" });

    render(<ReminderPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-pass"));
  });
});

describe("con una reserva válida", () => {
  it("recuerda la hora de llegada y el número de confirmación", async () => {
    render(<ReminderPage />);

    await waitFor(() =>
      expect(
        screen.getByText(`Tomorrow at 1:00 PM — your visit at ${ainsworth.name}`),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText(reference).length).toBeGreaterThan(0);
  });

  it("avisa del plazo de cancelación gratuita", async () => {
    render(<ReminderPage />);

    await waitFor(() => expect(screen.getByText(/cancel free of charge/i)).toBeInTheDocument());
  });
});
