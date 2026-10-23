import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { addDays, today } from "@/lib/availability";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedAdminAndSignIn } from "@/lib/testing/confirmed-user";

import LoungeEditPage from "./page";

/**
 * Story 3.1 — pestaña "Reviews" del detalle de un lounge en admin
 * (LoungeReviews.dc.html, LoungeReviewsEmpty.dc.html): solo lectura, con el
 * nombre completo del autor, el LP# de la visita y "View member".
 */
let currentId = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/lounges/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: currentId }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const reviewed = `test-lounge-admin-reviews-${stamp}`;
const unreviewed = `test-lounge-admin-noreviews-${stamp}`;
let memberId = "";

function lounge(id: string, name: string) {
  return { id, name, neighborhood: "NoHo", city: "New York", city_id: "new-york", lat: 0, lng: 0, hours: "8 AM – 9 PM", content_status: "live" };
}

beforeAll(async () => {
  await admin.from("lounges").insert([lounge(reviewed, `Reviewed ${stamp}`), lounge(unreviewed, `Unreviewed ${stamp}`)]);
  const { data: created } = await admin.auth.admin.createUser({
    email: `admin-reviews-m-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  memberId = created.user!.id;
  await admin.from("profiles").insert({
    id: memberId,
    full_name: "Marcus Chen",
    phone: "+15555550100",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  const date = addDays(today(), -3);
  const { data: booking } = await admin
    .from("bookings")
    .insert({ member_id: memberId, lounge_id: reviewed, date, band: "morning", slot_time: "8:00 AM", status: "completed", checked_in_at: `${date}T08:00:00Z` })
    .select("id")
    .single();
  await admin.from("reviews").insert({ booking_id: booking!.id, member_id: memberId, rating: 5, body: "Quietest corner in midtown." });

  await signUpConfirmedAdminAndSignIn(createClient(), `admin-reviews-${stamp}@ensoleil-test.example`, "EnSoleil!2026");
});

describe("pestaña Reviews", () => {
  it("lista las reseñas con el nombre completo, el LP# y el enlace al miembro", async () => {
    const user = userEvent.setup({ delay: null });
    currentId = reviewed;
    render(<LoungeEditPage />);

    await user.click(await screen.findByRole("tab", { name: /Reviews/ }));

    const list = await screen.findByRole("list", { name: "Member reviews" });
    const [item] = within(list).getAllByRole("listitem");
    expect(item).toHaveTextContent("Marcus Chen");
    expect(item).toHaveTextContent("Quietest corner in midtown.");
    expect(item).toHaveTextContent(/LP-\d{6}/);
    expect(within(item!).getByRole("link", { name: "View member" })).toHaveAttribute("href", `/admin/members/${memberId}`);
  });

  it("el recuento va en la pestaña y Details sigue mostrando el lounge", async () => {
    const user = userEvent.setup({ delay: null });
    currentId = reviewed;
    render(<LoungeEditPage />);

    expect(await screen.findByRole("tab", { name: "Reviews 1" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Reviews/ }));
    await user.click(screen.getByRole("tab", { name: "Details" }));
    expect(screen.queryByRole("list", { name: "Member reviews" })).toBeNull();
  });

  it("sin reseñas lo dice", async () => {
    const user = userEvent.setup({ delay: null });
    currentId = unreviewed;
    render(<LoungeEditPage />);

    await user.click(await screen.findByRole("tab", { name: /Reviews/ }));

    expect(await screen.findByRole("heading", { name: "No reviews yet" })).toBeInTheDocument();
    expect(screen.getByText(/No member has reviewed a visit to Unreviewed/)).toBeInTheDocument();
  });
});
