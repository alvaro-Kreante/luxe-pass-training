import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { addDays, today } from "./availability";
import { bookingReferenceFromId } from "./booking";
import { fetchAdminLoungeReviews, fetchPartnerReviews } from "./reviews";
import { signUpConfirmedAdminAndSignIn, signUpConfirmedPartnerAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 3.1 — reseñas de solo lectura para el partner (PartnerReviews.dc.html,
 * GuestDetailReviews.dc.html) y el admin (LoungeReviews.dc.html). El partner
 * ve las de sus lounges con el nombre abreviado; el admin, las de cualquier
 * lounge con el nombre completo y el miembro.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const stamp = Date.now();
const mine = `test-lounge-staff-reviews-a-${stamp}`;
const mineToo = `test-lounge-staff-reviews-b-${stamp}`;
const foreign = `test-lounge-staff-reviews-x-${stamp}`;
const partner = isolatedClient();
const otherPartner = isolatedClient();
const adminUser = isolatedClient();
let memberId = "";
const references: Record<string, string> = {};

function lounge(id: string, name: string) {
  return { id, name, neighborhood: "Test", city: "Test City", city_id: "test-city", lat: 0, lng: 0, hours: "Open 24 hours", content_status: "live" };
}

async function reviewedVisit(loungeId: string, daysAgo: number, rating: number, body: string) {
  const date = addDays(today(), -daysAgo);
  const { data: booking, error } = await admin
    .from("bookings")
    .insert({ member_id: memberId, lounge_id: loungeId, date, band: "morning", slot_time: "8:00 AM", status: "completed", checked_in_at: `${date}T08:01:00Z` })
    .select("id")
    .single();
  if (error) throw error;
  await admin.from("reviews").insert({ booking_id: booking.id, member_id: memberId, rating, body, mentions: ["Quiet"] });
  references[body] = bookingReferenceFromId(booking.id as string);
  return booking.id as string;
}

beforeAll(async () => {
  await admin.from("lounges").insert([lounge(mine, `Mine ${stamp}`), lounge(mineToo, `Mine Too ${stamp}`), lounge(foreign, `Foreign ${stamp}`)]);
  await signUpConfirmedPartnerAndSignIn(partner, `staff-reviews-p-${stamp}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: `Staff Reviews ${stamp}`,
    loungeIds: [mine, mineToo],
  });
  await signUpConfirmedPartnerAndSignIn(otherPartner, `staff-reviews-o-${stamp}@ensoleil-test.example`, "EnSoleil!2026", {
    businessName: `Other ${stamp}`,
    loungeIds: [foreign],
  });
  await signUpConfirmedAdminAndSignIn(adminUser, `staff-reviews-a-${stamp}@ensoleil-test.example`, "EnSoleil!2026");

  const { data: created, error } = await admin.auth.admin.createUser({
    email: `staff-reviews-m-${stamp}@ensoleil-test.example`,
    password: "EnSoleil!2026",
    email_confirm: true,
  });
  if (error) throw error;
  memberId = created.user.id;
  await admin.from("profiles").insert({
    id: memberId,
    full_name: "Marcus Chen",
    phone: "+15555550100",
    city: "New York",
    industry: "Testing",
    terms_accepted_at: new Date().toISOString(),
  });

  await reviewedVisit(mine, 2, 5, "Mine, newest.");
  await reviewedVisit(mineToo, 5, 3, "Mine too.");
  await reviewedVisit(foreign, 3, 1, "Foreign lounge.");
});

describe("partner", () => {
  it("con All lounges ve las reseñas de todos sus lounges, con lounge y LP#, y nunca las de otro partner", async () => {
    const { reviews, count } = await fetchPartnerReviews(partner, null);

    expect(reviews.map((review) => review.text)).toEqual(["Mine, newest.", "Mine too."]);
    expect(count).toBe(2);
    expect(reviews[0]).toMatchObject({ name: "Marcus C.", loungeName: `Mine ${stamp}`, reference: references["Mine, newest."] });
    expect(reviews[0]!.memberId).toBeUndefined();
  });

  it("con un lounge elegido ve solo las de ese lounge", async () => {
    const { reviews } = await fetchPartnerReviews(partner, mineToo);

    expect(reviews.map((review) => review.text)).toEqual(["Mine too."]);
  });

  it("no puede leer las de un lounge que no es suyo", async () => {
    const { reviews } = await fetchPartnerReviews(partner, foreign);

    expect(reviews).toEqual([]);
  });

  it("el historial del invitado trae la reseña de cada visita", async () => {
    const { data } = await partner.rpc("partner_guest_history", { p_member_id: memberId, p_lounge_id: null });
    const rows = data as { confirmation_code: string; review_rating: number | null; review_body: string | null }[];

    const newest = rows.find((row) => row.confirmation_code === references["Mine, newest."])!;
    expect(newest).toMatchObject({ review_rating: 5, review_body: "Mine, newest." });
  });
});

describe("admin", () => {
  it("ve las reseñas de cualquier lounge con el nombre completo y el miembro", async () => {
    const { reviews } = await fetchAdminLoungeReviews(adminUser, foreign);

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ name: "Marcus Chen", memberId, reference: references["Foreign lounge."], rating: 1 });
  });

  it("un partner no puede usar la vista del admin", async () => {
    await expect(fetchAdminLoungeReviews(partner, mine)).rejects.toThrow();
  });
});
