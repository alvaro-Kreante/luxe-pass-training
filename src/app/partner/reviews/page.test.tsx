import { createClient as createAdminClient } from "@supabase/supabase-js";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { PartnerReviewsView } from "@/components/partner/partner-reviews-view";
import { addDays, today } from "@/lib/availability";
import { loadPartnerReviews } from "@/lib/partner";
import { selectPartnerLounge } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";
import { signUpConfirmedPartnerAndSignIn } from "@/lib/testing/confirmed-user";

/**
 * Story 3.1 — reseñas de solo lectura del partner (PartnerReviews.dc.html y
 * PartnerReviewsEmpty.dc.html). PERF-02: la página es un Server Component
 * (`requirePartner()` + `loadPartnerReviews`); el test carga lo mismo con la
 * sesión de partner de test y renderiza la vista.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/reviews",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const first = `test-lounge-partner-reviews-a-${stamp}`;
const second = `test-lounge-partner-reviews-b-${stamp}`;

async function renderPage() {
  return render(<PartnerReviewsView {...await loadPartnerReviews(createClient())} />);
}

beforeAll(async () => {
  const lounge = (id: string, name: string) => ({
    id,
    name,
    neighborhood: "Test",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "live",
  });
  await admin.from("lounges").insert([lounge(first, `First ${stamp}`), lounge(second, `Second ${stamp}`)]);
  await signUpConfirmedPartnerAndSignIn(createClient(), `partner-reviews-${stamp}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: `Partner Reviews ${stamp}`,
    loungeIds: [first, second],
  });

  const { data: created } = await admin.auth.admin.createUser({
    email: `partner-reviews-m-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  const memberId = created.user!.id;
  await admin.from("profiles").insert({
    id: memberId,
    full_name: "Amara Okafor",
    phone: "+15555550100",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });
  const date = addDays(today(), -2);
  const { data: booking } = await admin
    .from("bookings")
    .insert({ member_id: memberId, lounge_id: first, date, band: "morning", slot_time: "8:00 AM", status: "completed", checked_in_at: `${date}T08:00:00Z` })
    .select("id")
    .single();
  await admin.from("reviews").insert({ booking_id: booking!.id, member_id: memberId, rating: 4, body: "", mentions: ["Showers"] });
});

describe("con reseñas", () => {
  it("All lounges: nota media, recuento y cada reseña con su lounge", async () => {
    await selectPartnerLounge(createClient(), null);
    await renderPage();

    expect(await screen.findByText("From 1 reviewed visit")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Member reviews" });
    const [item] = within(list).getAllByRole("listitem");
    expect(item).toHaveTextContent("Amara O.");
    expect(item).toHaveTextContent(`First ${stamp}`);
    expect(item).toHaveTextContent(/LP-\d{6}/);
    expect(item).toHaveTextContent("Rated without a comment");
    expect(within(item).getByText("Showers")).toBeInTheDocument();
  });

  it("aparece en el menú lateral del partner", async () => {
    await selectPartnerLounge(createClient(), null);
    await renderPage();

    expect(await screen.findByRole("link", { name: "Reviews" })).toHaveAttribute("href", "/partner/reviews");
  });
});

describe("sin reseñas", () => {
  it("con un lounge elegido sin reseñas dice que aún no hay", async () => {
    await selectPartnerLounge(createClient(), second);
    await renderPage();

    expect(await screen.findByRole("heading", { name: "No reviews yet" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Member reviews" })).toBeNull();
  });
});
