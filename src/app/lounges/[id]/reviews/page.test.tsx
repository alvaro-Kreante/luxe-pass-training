import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { addDays, today } from "@/lib/availability";
import { formatVisitDate } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAndSignIn } from "@/lib/testing/confirmed-user";

import ReviewsPage from "./page";

/**
 * Story 3.1 — "User ratings and review count (if available)".
 * Reviews.dc.html (con reseñas) y NoRatings.dc.html (sin reseñas todavía).
 * Reseñas reales (`reviews`): una por visita, así que un miembro que vuelve
 * al mismo lounge aparece una vez por cada visita reseñada.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const reviewedId = `test-lounge-reviewed-${stamp}`;
const emptyId = `test-lounge-unreviewed-${stamp}`;
const params = vi.fn(() => ({ id: reviewedId }));

vi.mock("next/navigation", () => ({
  useParams: () => params(),
  usePathname: () => "/lounges/x/reviews",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function lounge(id: string, name: string) {
  return {
    id,
    name,
    neighborhood: "Test Neighborhood",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "live",
  };
}

async function reviewedVisit(memberId: string, daysAgo: number, rating: number, body: string, mentions: string[]) {
  const date = addDays(today(), -daysAgo);
  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: reviewedId,
      date,
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
      checked_in_at: `${date}T08:05:00Z`,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: reviewError } = await admin
    .from("reviews")
    .insert({ booking_id: booking.id, member_id: memberId, rating, body, mentions });
  if (reviewError) throw reviewError;
}

beforeAll(async () => {
  await admin.from("lounges").insert([lounge(reviewedId, `Reviewed ${stamp}`), lounge(emptyId, `Unreviewed ${stamp}`)]);

  const { data: created, error } = await admin.auth.admin.createUser({
    email: `reviews-author-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;
  await admin.from("profiles").insert({
    id: created.user.id,
    full_name: "Marcus Chen",
    phone: "+15555550100",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  await reviewedVisit(created.user.id, 12, 5, "Quiet booths, great espresso.", ["Quiet", "Coffee"]);
  await reviewedVisit(created.user.id, 3, 4, "Busier this time, still good.", ["Quiet"]);

  await signUpConfirmedAndSignIn(createClient(), `lounge-reviews-${stamp}@ensoleil-test.example`, "EnSoleil!2026");
});

beforeEach(() => {
  params.mockReturnValue({ id: reviewedId });
});

describe("con reseñas", () => {
  it("muestra la valoración media y el recuento reales", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("2 member reviews")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "4.5" })).toBeInTheDocument();
  });

  it("un miembro que volvió aparece una vez por visita, cada una con su fecha", async () => {
    render(<ReviewsPage />);

    const list = await screen.findByRole("list", { name: "Member reviews" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Marcus C.");
    expect(items[0]).toHaveTextContent(`Visited ${formatVisitDate(addDays(today(), -3))}`);
    expect(items[0]).toHaveTextContent("Busier this time, still good.");
    expect(items[1]).toHaveTextContent(`Visited ${formatVisitDate(addDays(today(), -12))}`);
  });

  it("las menciones cuentan lo que marcaron los miembros", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("What members mention")).toBeInTheDocument());
    expect(screen.getByText("Quiet 2")).toBeInTheDocument();
    expect(screen.getByText("Coffee 1")).toBeInTheDocument();
  });
});

describe("dónde se escribe una reseña", () => {
  it("no se escribe desde aquí: se deja desde el detalle de cada reserva en My Pass", async () => {
    render(<ReviewsPage />);

    await screen.findByText("2 member reviews");
    expect(screen.queryByRole("button", { name: "Write a review" })).toBeNull();
  });
});

describe("sin reseñas todavía", () => {
  beforeEach(() => {
    params.mockReturnValue({ id: emptyId });
  });

  it("dice que no hay reseñas y ofrece ver disponibilidad o reservar", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("No reviews yet")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "See availability" })).toHaveAttribute(
      "href",
      `/lounges/${emptyId}/availability`,
    );
    expect(screen.getByRole("link", { name: "Book a visit" })).toHaveAttribute("href", `/lounges/${emptyId}/book`);
  });

  it("no muestra el reparto de estrellas cuando no hay reseñas", async () => {
    render(<ReviewsPage />);

    await waitFor(() => expect(screen.getByText("No reviews yet")).toBeInTheDocument());
    expect(screen.queryByText("What members mention")).toBeNull();
  });
});
