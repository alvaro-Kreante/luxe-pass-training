import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { addDays, today } from "@/lib/availability";
import { fetchLoungeReviews, fetchReviewableVisits, type ReviewableVisit } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { WriteReviewDialog } from "./write-review-dialog";

/**
 * Story 3.1 — escribir la reseña de una visita (`WriteReview*.dc.html`).
 * Solo visitas con check-in; una reseña por visita, así que con varias
 * visitas sin reseñar se elige primero cuál (`WriteReviewPickVisit`).
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/lounges/x/reviews",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const loungeId = `test-lounge-write-review-${stamp}`;
const loungeName = `Write Review ${stamp}`;
let memberId = "";

beforeAll(async () => {
  await admin.from("lounges").insert({
    id: loungeId,
    name: loungeName,
    neighborhood: "Test Neighborhood",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "live",
  });
  const user = await signUpConfirmedMemberAndSignIn(
    createClient(),
    `write-review-${stamp}@ensoleil-test.example`,
    "EnSoleil!2026",
    { fullName: "Elena Lowe", membership: "annual" },
  );
  memberId = user.id;
});

async function checkedInVisit(daysAgo: number): Promise<string> {
  const date = addDays(today(), -daysAgo);
  const { data, error } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: loungeId,
      date,
      band: "morning",
      slot_time: "10:30 AM",
      status: "completed",
      checked_in_at: `${date}T10:12:00Z`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function visitsFor(ids: string[]): Promise<ReviewableVisit[]> {
  const visits = await fetchReviewableVisits(createClient(), loungeId);
  return visits.filter((visit) => ids.includes(visit.bookingId));
}

function renderDialog(visits: ReviewableVisit[], onPosted = vi.fn()) {
  render(
    <WriteReviewDialog open onOpenChange={vi.fn()} loungeName={loungeName} visits={visits} onPosted={onPosted} />,
  );
  return onPosted;
}

describe("una sola visita sin reseñar", () => {
  it("va directo al formulario de esa visita y no deja publicar sin estrellas", async () => {
    const id = await checkedInVisit(30);
    const visits = await visitsFor([id]);

    renderDialog(visits);

    const dialog = await screen.findByRole("dialog", { name: loungeName });
    expect(within(dialog).getByText(visits[0]!.dateLabel)).toBeInTheDocument();
    expect(within(dialog).getByText(visits[0]!.reference)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Choose another visit" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Post review" })).toBeDisabled();
  });

  it("publica la reseña con nota, texto y etiquetas, y da las gracias", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await checkedInVisit(31);
    const onPosted = renderDialog(await visitsFor([id]));

    await user.click(await screen.findByRole("radio", { name: "4 stars" }));
    expect(screen.getByText("Very good")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Tell other members about your visit/), "Quiet corner seats.");
    expect(screen.getByText("19 / 1000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quiet" }));
    await user.click(screen.getByRole("button", { name: "Coffee" }));
    expect(screen.getByText(/2 selected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Post review" }));

    expect(await screen.findByRole("heading", { name: "Thank you" })).toBeInTheDocument();
    expect(onPosted).toHaveBeenCalled();
    const { reviews } = await fetchLoungeReviews(createClient(), loungeId);
    const posted = reviews.find((review) => review.text === "Quiet corner seats.")!;
    expect(posted.rating).toBe(4);
    expect(posted.mentions).toEqual(["Quiet", "Coffee"]);
  });

  it("no deja marcar más de 5 etiquetas", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await checkedInVisit(32);
    renderDialog(await visitsFor([id]));

    for (const label of ["Quiet", "Fast WiFi", "Staff", "Coffee", "Food"]) {
      await user.click(await screen.findByRole("button", { name: label }));
    }

    expect(screen.getByRole("button", { name: "Showers" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quiet" })).toHaveAttribute("aria-pressed", "true");
  });

  it("si no se puede publicar, avisa y conserva lo escrito", async () => {
    const user = userEvent.setup({ delay: null });
    const id = await checkedInVisit(33);
    const visits = await visitsFor([id]);
    renderDialog(visits);
    // Otra pestaña ya la publicó: el insert choca con "una reseña por visita".
    await admin.from("reviews").insert({ booking_id: id, member_id: memberId, rating: 5 });

    await user.click(await screen.findByRole("radio", { name: "3 stars" }));
    await user.type(screen.getByLabelText(/Tell other members about your visit/), "Kept text");
    await user.click(screen.getByRole("button", { name: "Post review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't post your review.");
    expect(screen.getByLabelText(/Tell other members about your visit/)).toHaveValue("Kept text");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("varias visitas sin reseñar al mismo lounge", () => {
  it("pide elegir la visita y reseña la elegida", async () => {
    const user = userEvent.setup({ delay: null });
    const newer = await checkedInVisit(40);
    const older = await checkedInVisit(55);
    const visits = await visitsFor([newer, older]);
    renderDialog(visits);

    expect(await screen.findByRole("heading", { name: "Which visit?" })).toBeInTheDocument();
    expect(screen.getByText(/You have 2 visits to/)).toBeInTheDocument();
    const olderVisit = visits.find((visit) => visit.bookingId === older)!;
    await user.click(screen.getByRole("radio", { name: new RegExp(olderVisit.dateLabel) }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText(olderVisit.dateLabel)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose another visit" }));
    expect(screen.getByRole("heading", { name: "Which visit?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("radio", { name: "5 stars" }));
    await user.click(screen.getByRole("button", { name: "Post review" }));
    await screen.findByRole("heading", { name: "Thank you" });

    const remaining = (await fetchReviewableVisits(createClient(), loungeId)).map((visit) => visit.bookingId);
    expect(remaining).toContain(newer);
    expect(remaining).not.toContain(older);
  });
});
