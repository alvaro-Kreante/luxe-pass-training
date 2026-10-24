import { createClient as createAdminClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import { addDays, today } from "./availability";
import { fetchLoungeReviews, submitReview } from "./reviews";
import { signUpConfirmedMemberAndSignIn } from "./testing/confirmed-user";
import { isolatedClient } from "./testing/partner-invite-fixture";

/**
 * Story 3.1 — "User ratings and review count (if available)", ahora con
 * reseñas reales. Decisiones del usuario (23 oct 2026): solo reseña quien
 * hizo check-in, una reseña por visita (un miembro que vuelve al mismo
 * lounge puede dejar varias) y nada de cifras sembradas.
 */

const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
let loungeId: string;

beforeAll(async () => {
  loungeId = `test-lounge-reviews-${Date.now()}`;
  const { error } = await admin.from("lounges").insert({
    id: loungeId,
    name: `Reviews Test Lounge ${Date.now()}`,
    neighborhood: "Test Neighborhood",
    city: "Test City",
    city_id: "test-city",
    lat: 0,
    lng: 0,
    hours: "Open 24 hours",
    content_status: "live",
  });
  if (error) throw error;
});

async function member(label: string, fullName = "Priya Testwood") {
  const supabase = isolatedClient();
  const user = await signUpConfirmedMemberAndSignIn(
    supabase,
    `reviews-${label}-${Date.now()}@ensoleil-test.example`,
    "EnSoleil!2026",
    { fullName, membership: "annual" },
  );
  return { supabase, user };
}

async function visit(memberId: string, options: { daysAgo: number; checkedIn: boolean }) {
  const date = addDays(today(), -options.daysAgo);
  const { data, error } = await admin
    .from("bookings")
    .insert({
      member_id: memberId,
      lounge_id: loungeId,
      date,
      band: "morning",
      slot_time: "8:00 AM",
      status: "completed",
      checked_in_at: options.checkedIn ? `${date}T08:10:00Z` : null,
      no_show: !options.checkedIn,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe("dejar una reseña", () => {
  it("quien hizo check-in reseña su visita y aparece con su nombre abreviado y la fecha", async () => {
    const { supabase, user } = await member("checked-in");
    const bookingId = await visit(user.id, { daysAgo: 3, checkedIn: true });

    await submitReview(supabase, { bookingId, rating: 4, body: "Quiet and calm.", mentions: ["Quiet"] });

    const { reviews } = await fetchLoungeReviews(supabase, loungeId);
    const mine = reviews.find((review) => review.id && review.text === "Quiet and calm.")!;
    expect(mine.name).toBe("Priya T.");
    expect(mine.rating).toBe(4);
    expect(mine.visitedOn).toBe(addDays(today(), -3));
    expect(mine.tier).toBe("Annual member");
  });

  it("no deja reseñar una visita sin check-in", async () => {
    const { supabase, user } = await member("no-show");
    const bookingId = await visit(user.id, { daysAgo: 2, checkedIn: false });

    await expect(submitReview(supabase, { bookingId, rating: 5, body: "", mentions: [] })).rejects.toThrow();
  });

  it("no deja reseñar dos veces la misma visita", async () => {
    const { supabase, user } = await member("twice");
    const bookingId = await visit(user.id, { daysAgo: 4, checkedIn: true });

    await submitReview(supabase, { bookingId, rating: 5, body: "", mentions: [] });

    await expect(submitReview(supabase, { bookingId, rating: 3, body: "", mentions: [] })).rejects.toThrow();
  });

  it("no deja reseñar la visita de otro miembro", async () => {
    const owner = await member("owner");
    const intruder = await member("intruder");
    const bookingId = await visit(owner.user.id, { daysAgo: 5, checkedIn: true });

    await expect(
      submitReview(intruder.supabase, { bookingId, rating: 1, body: "", mentions: [] }),
    ).rejects.toThrow();
  });

  it("rechaza una nota fuera de 1–5", async () => {
    const { supabase, user } = await member("range");
    const bookingId = await visit(user.id, { daysAgo: 6, checkedIn: true });

    await expect(submitReview(supabase, { bookingId, rating: 6, body: "", mentions: [] })).rejects.toThrow();
  });
});

describe("varias visitas al mismo lounge", () => {
  it("cada visita tiene su propia reseña, con su fecha", async () => {
    const { supabase, user } = await member("regular", "Marcus Chen");
    const older = await visit(user.id, { daysAgo: 20, checkedIn: true });
    const newer = await visit(user.id, { daysAgo: 8, checkedIn: true });

    await submitReview(supabase, { bookingId: newer, rating: 5, body: "Second visit.", mentions: [] });
    await submitReview(supabase, { bookingId: older, rating: 3, body: "First visit.", mentions: [] });

    const { reviews } = await fetchLoungeReviews(supabase, loungeId);
    const marcus = reviews.filter((review) => review.name === "Marcus C.");
    expect(marcus.map((review) => review.visitedOn)).toEqual([addDays(today(), -8), addDays(today(), -20)]);
  });
});

describe("agregados", () => {
  it("la nota, el recuento, el reparto y las menciones salen de las reseñas reales", async () => {
    const { supabase, user } = await member("aggregate");
    const a = await visit(user.id, { daysAgo: 10, checkedIn: true });
    const b = await visit(user.id, { daysAgo: 11, checkedIn: true });
    await submitReview(supabase, { bookingId: a, rating: 5, body: "", mentions: ["Showers"] });
    await submitReview(supabase, { bookingId: b, rating: 2, body: "", mentions: ["Showers", "Staff"] });

    const summary = await fetchLoungeReviews(supabase, loungeId);
    const { data: lounge } = await admin.from("lounges").select("rating, review_count").eq("id", loungeId).single();

    expect(lounge!.review_count).toBe(summary.count);
    expect(Number(lounge!.rating)).toBeCloseTo(summary.rating, 1);
    expect(summary.breakdown.reduce((sum, row) => sum + row.count, 0)).toBe(summary.count);
    expect(summary.mentions.find((m) => m.label === "Showers")!.count).toBeGreaterThanOrEqual(2);
  });

  it("un lounge sin reseñas da 0 y lista vacía", async () => {
    const { supabase } = await member("empty");
    const emptyId = `test-lounge-noreviews-${Date.now()}`;
    await admin.from("lounges").insert({
      id: emptyId,
      name: `No Reviews ${Date.now()}`,
      neighborhood: "Test",
      city: "Test City",
      city_id: "test-city",
      lat: 0,
      lng: 0,
      hours: "Open 24 hours",
      content_status: "live",
    });

    const summary = await fetchLoungeReviews(supabase, emptyId);

    expect(summary.count).toBe(0);
    expect(summary.reviews).toEqual([]);
    expect(summary.mentions).toEqual([]);
  });
});
