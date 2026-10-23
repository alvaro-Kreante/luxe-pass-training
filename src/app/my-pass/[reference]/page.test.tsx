import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { bookingReferenceFromId } from "@/lib/booking";
import { addDays, today } from "@/lib/availability";
import { LOUNGES } from "@/lib/lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import PassDetailPage from "./page";

/**
 * Story 5.1 — el pase digital y su expiración automática al cerrar la
 * ventana de la reserva. `Main` (upcoming) · `ArrivalDay` (today) ·
 * `CheckedIn` · `Expired.dc.html` son cuatro estados de la misma pantalla,
 * que salen del estado real de la reserva: `expire_finished_bookings`
 * (pg_cron) la cierra al acabar la ventana.
 *
 * Story 3.1 — la reseña se deja desde el detalle de cada reserva con
 * check-in, una por visita.
 *
 * Backend real (Supabase local): `fetchDigitalPass` trae la reserva propia
 * por LP# (RLS). Cada test siembra la reserva en el estado que necesita.
 */
let reference = "";
const params = vi.fn(() => ({ reference }));
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useParams: () => params(),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/my-pass/reference",
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ainsworth = LOUNGES.find((lounge) => lounge.id === "the-ainsworth")!;
let memberId = "";

beforeAll(async () => {
  const user = await signUpConfirmedMemberAndSignIn(
    createClient(),
    `pass-detail-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
    { membership: "annual" },
  );
  memberId = user.id;
});

beforeEach(() => {
  replace.mockClear();
});

async function booking({
  daysFromToday,
  status,
  checkedIn = false,
  noShow = false,
}: {
  daysFromToday: number;
  status: "confirmed" | "in_progress" | "completed";
  checkedIn?: boolean;
  noShow?: boolean;
}) {
  const date = addDays(today("America/New_York"), daysFromToday);
  const { data, error } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: ainsworth.id,
      date,
      band: "afternoon",
      slot_time: "3:30 PM",
      status,
      checked_in_at: checkedIn ? `${date}T15:34:00Z` : null,
      no_show: noShow,
    })
    .select("id")
    .single();
  if (error) throw error;
  reference = bookingReferenceFromId(data.id as string);
  params.mockReturnValue({ reference });
}

describe("guardia de entrada", () => {
  it("vuelve a My Pass si el número de confirmación no existe", async () => {
    params.mockReturnValue({ reference: "LP-000000" });

    render(<PassDetailPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-pass"));
  });
});

describe("el estado sale de la reserva", () => {
  it("una reserva confirmada de otro día es el pase de siempre", async () => {
    await booking({ daysFromToday: 3, status: "confirmed" });

    render(<PassDetailPage />);

    expect(await screen.findByRole("heading", { name: "Your digital pass" })).toBeInTheDocument();
    expect(screen.getAllByText(reference).length).toBeGreaterThan(0);
  });

  it("una reserva confirmada de hoy muestra la cuenta atrás", async () => {
    await booking({ daysFromToday: 0, status: "confirmed" });

    render(<PassDetailPage />);

    expect(await screen.findByRole("heading", { name: "You are expected today" })).toBeInTheDocument();
  });

  it("con check-in confirma que el miembro está dentro", async () => {
    await booking({ daysFromToday: 0, status: "in_progress", checkedIn: true });

    render(<PassDetailPage />);

    expect(await screen.findByRole("heading", { name: "You are checked in" })).toBeInTheDocument();
  });

  it("cerrada al acabar la ventana, explica que expiró", async () => {
    await booking({ daysFromToday: -2, status: "completed", checkedIn: true });

    render(<PassDetailPage />);

    expect(await screen.findByRole("heading", { name: "This pass has expired" })).toBeInTheDocument();
    expect(screen.getByText(/checked in at reception/i)).toBeInTheDocument();
  });

  it("'Book … again' lleva a reservar otra visita en el mismo lounge", async () => {
    await booking({ daysFromToday: -2, status: "completed", checkedIn: true });

    render(<PassDetailPage />);

    expect(await screen.findByRole("link", { name: `Book ${ainsworth.name} again` })).toHaveAttribute(
      "href",
      `/lounges/${ainsworth.id}/book`,
    );
  });
});

describe("reseña de la visita", () => {
  it("sin check-in no se puede reseñar", async () => {
    await booking({ daysFromToday: -3, status: "completed", noShow: true });

    render(<PassDetailPage />);

    await screen.findByRole("heading", { name: "This pass has expired" });
    expect(screen.queryByRole("button", { name: "Leave a review" })).toBeNull();
  });

  it("una reserva aún sin empezar no se puede reseñar", async () => {
    await booking({ daysFromToday: 2, status: "confirmed" });

    render(<PassDetailPage />);

    await screen.findByRole("heading", { name: "Your digital pass" });
    expect(screen.queryByRole("button", { name: "Leave a review" })).toBeNull();
  });

  it("con check-in, aún en el lounge, ya se puede reseñar", async () => {
    await booking({ daysFromToday: 0, status: "in_progress", checkedIn: true });

    render(<PassDetailPage />);

    expect(await screen.findByRole("button", { name: "Leave a review" })).toBeInTheDocument();
  });

  it("'Leave a review' reseña esa visita y después lleva a verla", async () => {
    const user = userEvent.setup({ delay: null });
    await booking({ daysFromToday: -2, status: "completed", checkedIn: true });

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
