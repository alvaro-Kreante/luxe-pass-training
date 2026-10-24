import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { addDays, today } from "@/lib/availability";
import { bookingReferenceFromId } from "@/lib/booking";
import { formatFullDate } from "@/lib/passes";
import { fetchLoungeReviews, type ReviewVisit } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedMemberAndSignIn } from "@/lib/testing/confirmed-user";

import { WriteReviewDialog } from "./write-review-dialog";

/**
 * Story 3.1 — escribir la reseña de una visita (`WriteReview*.dc.html`),
 * desde el detalle de esa reserva. Solo visitas con check-in; una reseña
 * por visita.
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

async function visitOf(daysAgo: number): Promise<ReviewVisit & { id: string }> {
  const id = await checkedInVisit(daysAgo);
  return { id, bookingId: id, reference: bookingReferenceFromId(id), dateLabel: formatFullDate(addDays(today(), -daysAgo)) };
}

function renderDialog(visit: ReviewVisit, onPosted = vi.fn()) {
  render(<WriteReviewDialog open onOpenChange={vi.fn()} loungeName={loungeName} visit={visit} onPosted={onPosted} />);
  return onPosted;
}

describe("formulario de reseña", () => {
  it("muestra la visita que se reseña y no deja publicar sin estrellas", async () => {
    const visit = await visitOf(30);

    renderDialog(visit);

    const dialog = await screen.findByRole("dialog", { name: loungeName });
    expect(within(dialog).getByText(visit.dateLabel)).toBeInTheDocument();
    expect(within(dialog).getByText(visit.reference)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Post review" })).toBeDisabled();
  });

  it("publica la reseña con nota, texto y etiquetas, y da las gracias", async () => {
    const user = userEvent.setup({ delay: null });
    const onPosted = renderDialog(await visitOf(31));

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
    renderDialog(await visitOf(32));

    for (const label of ["Quiet", "Fast WiFi", "Staff", "Coffee", "Food"]) {
      await user.click(await screen.findByRole("button", { name: label }));
    }

    expect(screen.getByRole("button", { name: "Showers" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quiet" })).toHaveAttribute("aria-pressed", "true");
  });

  it("si no se puede publicar, avisa y conserva lo escrito", async () => {
    const user = userEvent.setup({ delay: null });
    const visit = await visitOf(33);
    renderDialog(visit);
    // Otra pestaña ya la publicó: el insert choca con "una reseña por visita".
    await admin.from("reviews").insert({ booking_id: visit.id, member_id: memberId, rating: 5 });

    await user.click(await screen.findByRole("radio", { name: "3 stars" }));
    await user.type(screen.getByLabelText(/Tell other members about your visit/), "Kept text");
    await user.click(screen.getByRole("button", { name: "Post review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't post your review.");
    expect(screen.getByLabelText(/Tell other members about your visit/)).toHaveValue("Kept text");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
