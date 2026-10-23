import type { SupabaseClient } from "@supabase/supabase-js";


/**
 * Story 3.1 — "User ratings and review count (if available)" con reseñas
 * reales (`supabase/schemas/reviews.sql`). Una reseña por visita: el mismo
 * miembro puede tener varias en un lounge, cada una con su fecha de visita.
 */

export interface RatingBreakdownRow {
  stars: 5 | 4 | 3 | 2 | 1;
  count: number;
}

export interface LoungeReview {
  id: string;
  initials: string;
  /** "Priya T." */
  name: string;
  tier: string;
  /** ISO de la visita reseñada. */
  visitedOn: string;
  rating: number;
  text: string;
  mentions: string[];
}

export interface LoungeReviews {
  rating: number;
  count: number;
  breakdown: RatingBreakdownRow[];
  mentions: { label: string; count: number }[];
  reviews: LoungeReview[];
}

/** Lo que el miembro puede marcar al reseñar; "What members mention" cuenta estas. */
export const REVIEW_MENTIONS = ["Quiet", "Fast WiFi", "Staff", "Coffee", "Food", "Showers", "Workspace"] as const;

export const REVIEW_BODY_MAX = 1000;
export const REVIEW_MENTIONS_MAX = 5;

interface ReviewRow {
  id: string;
  author_name: string;
  plan: "monthly" | "annual" | null;
  visited_on: string;
  rating: number;
  body: string;
  mentions: string[];
}

/** "Sep 4"; con el año si no es el actual, para no confundir visitas de años distintos. */
export function formatVisitDate(dateIso: string, now: Date = new Date()): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date);
}

const TIER_LABEL = { monthly: "Monthly member", annual: "Annual member" } as const;

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fromRow(row: ReviewRow): LoungeReview {
  return {
    id: row.id,
    initials: initialsOf(row.author_name),
    name: row.author_name,
    tier: row.plan ? TIER_LABEL[row.plan] : "Member",
    visitedOn: row.visited_on,
    rating: row.rating,
    text: row.body,
    mentions: row.mentions,
  };
}

export function summarizeReviews(reviews: LoungeReview[]): Omit<LoungeReviews, "reviews"> {
  const count = reviews.length;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  const breakdown = ([5, 4, 3, 2, 1] as const).map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }));

  const tally = new Map<string, number>();
  for (const review of reviews) {
    for (const label of review.mentions) tally.set(label, (tally.get(label) ?? 0) + 1);
  }
  const mentions = [...tally.entries()]
    .map(([label, mentionCount]) => ({ label, count: mentionCount }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  return { rating: count ? Math.round((total / count) * 10) / 10 : 0, count, breakdown, mentions };
}

export async function fetchLoungeReviews(supabase: SupabaseClient, loungeId: string): Promise<LoungeReviews> {
  const { data, error } = await supabase.rpc("lounge_reviews", { p_lounge_id: loungeId });
  if (error) throw error;

  const reviews = ((data ?? []) as ReviewRow[]).map(fromRow);

  return { ...summarizeReviews(reviews), reviews };
}

export interface ReviewInput {
  bookingId: string;
  rating: number;
  body: string;
  mentions: string[];
}

export async function submitReview(supabase: SupabaseClient, input: ReviewInput): Promise<void> {
  const { error } = await supabase.from("reviews").insert({
    booking_id: input.bookingId,
    rating: input.rating,
    body: input.body.trim(),
    mentions: input.mentions,
  });
  if (error) throw error;
}

/** La visita que se reseña, tal como la muestra el formulario. */
export interface ReviewVisit {
  bookingId: string;
  reference: string;
  /** "Thu, Oct 16, 2026" */
  dateLabel: string;
}
