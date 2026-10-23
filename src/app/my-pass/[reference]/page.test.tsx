import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { bookingReferenceFromId, confirmBooking } from "@/lib/booking";
import { addDays, today } from "@/lib/availability";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import PassDetailPage from "./page";

/**
 * Story 5.1 — el pase digital y su expiración automática al cerrar la
 * ventana de la reserva. `Main` (upcoming) · `ArrivalDay` (today) ·
 * `CheckedIn` · `Expired.dc.html` son cuatro estados de la misma pantalla,
 * alcanzados por `?state=` (ver cabecera de `src/lib/passes.ts` — sigue sin
 * haber un cron que dispare la expiración sola).
 *
 * Backend real (Supabase local): `fetchDigitalPass` trae la reserva propia
 * por LP# (RLS), así que cada test confirma una reserva real primero.
 */
let reference = "";
const params = vi.fn(() => ({ reference }));
const replace = vi.fn();
let query = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useParams: () => params(),
  useSearchParams: () => query,
  usePathname: () => "/my-pass/reference",
}));

const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;

beforeAll(async () => {
  const supabase = createClient();
  await signUpConfirmedMemberAndSignIn(
    supabase,
    `pass-detail-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
    { membership: "annual" },
  );

  const booking = await confirmBooking(supabase, {
    loungeId: ainsworth.id,
    dateIso: today(),
    band: "morning",
    time: "10:30 AM",
    specialRequests: "",
  });
  if (!booking) throw new Error("No se pudo confirmar la reserva de prueba");

  reference = bookingReferenceFromId(booking.id);
});

beforeEach(() => {
  params.mockReturnValue({ reference });
  replace.mockClear();
  query = new URLSearchParams();
});

describe("guardia de entrada", () => {
  it("vuelve a My Pass si el número de confirmación no existe", async () => {
    params.mockReturnValue({ reference: "LP-000000" });

    render(<PassDetailPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-pass"));
  });
});

describe("estado por defecto (upcoming)", () => {
  it("muestra el pase con el LP# real", async () => {
    render(<PassDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Your digital pass" })).toBeInTheDocument(),
    );
    expect(screen.getAllByText(reference).length).toBeGreaterThan(0);
  });
});

describe("?state=today", () => {
  it("muestra la cuenta atrás del día de la reserva", async () => {
    query = new URLSearchParams("state=today");

    render(<PassDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "You are expected today" })).toBeInTheDocument(),
    );
  });
});

describe("?state=checked-in", () => {
  it("confirma el check-in en la app del miembro", async () => {
    query = new URLSearchParams("state=checked-in");

    render(<PassDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "You are checked in" })).toBeInTheDocument(),
    );
  });
});

describe("?state=expired", () => {
  it("explica que la reserva expiró automáticamente al cerrar la ventana", async () => {
    query = new URLSearchParams("state=expired");

    render(<PassDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "This pass has expired" })).toBeInTheDocument(),
    );
    expect(screen.getByText(/never checked in|checked in at reception/i)).toBeInTheDocument();
  });

  it("'Book … again' lleva a reservar otra visita en el mismo lounge", async () => {
    query = new URLSearchParams("state=expired");

    render(<PassDetailPage />);

    expect(await screen.findByRole("link", { name: `Book ${ainsworth.name} again` })).toHaveAttribute(
      "href",
      `/lounges/${ainsworth.id}/book`,
    );
  });
});

describe("?state=expired — reseña de la visita", () => {
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  async function pastVisit(checkedIn: boolean) {
    const {
      data: { user },
    } = await createClient().auth.getUser();
    const date = addDays(today(), checkedIn ? -2 : -3);
    const { data, error } = await admin
      .from("bookings")
      .insert({
        member_id: user!.id,
        lounge_id: ainsworth.id,
        date,
        band: "morning",
        slot_time: "8:00 AM",
        status: "completed",
        checked_in_at: checkedIn ? `${date}T08:04:00Z` : null,
        no_show: !checkedIn,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  it("una visita sin check-in no se puede reseñar", async () => {
    params.mockReturnValue({ reference: bookingReferenceFromId(await pastVisit(false)) });
    query = new URLSearchParams("state=expired");

    render(<PassDetailPage />);

    await screen.findByRole("heading", { name: "This pass has expired" });
    expect(screen.queryByRole("button", { name: "Leave a review" })).toBeNull();
  });

  it("'Leave a review' reseña esa visita y después lleva a verla", async () => {
    const user = userEvent.setup({ delay: null });
    params.mockReturnValue({ reference: bookingReferenceFromId(await pastVisit(true)) });
    query = new URLSearchParams("state=expired");

    render(<PassDetailPage />);
    await user.click(await screen.findByRole("button", { name: "Leave a review" }));
    await user.click(await screen.findByRole("radio", { name: "4 stars" }));
    await user.click(screen.getByRole("button", { name: "Post review" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));

    expect(await screen.findByRole("link", { name: "See your review" })).toHaveAttribute(
      "href",
      `/lounges/${ainsworth.id}/reviews`,
    );
    expect(screen.queryByRole("button", { name: "Leave a review" })).toBeNull();
  });
});
