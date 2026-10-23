"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Star } from "lucide-react";

import { RequireSession } from "@/components/onboarding/require-session";
import { LoungeSubviewHeader } from "@/components/lounges/lounge-subview-header";
import { RatingSummary } from "@/components/lounges/rating-summary";
import { ReviewCard } from "@/components/lounges/review-card";
import { WriteReviewDialog } from "@/components/lounges/write-review-dialog";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchLoungeProfile, type LoungeProfile } from "@/lib/lounge-profile";
import {
  fetchLoungeReviews,
  fetchReviewableVisits,
  type LoungeReviews,
  type ReviewableVisit,
} from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — "User ratings and review count (if available)".
 * Sub-vista de lounge (DESIGN-SYSTEM.md §5 patrón 8).
 * Artboards: `Reviews.dc.html` y `NoRatings.dc.html`.
 * Reseñas reales (`reviews`, `lounge_reviews`): una por visita con check-in,
 * así que un miembro que vuelve aparece una vez por visita reseñada.
 */
export default function ReviewsPage() {
  return (
    <RequireSession>
      <ReviewsScreen />
    </RequireSession>
  );
}

function ReviewsScreen() {
  const { id } = useParams<{ id: string }>();
  const [lounge, setLounge] = React.useState<LoungeProfile | null | undefined>(
    undefined,
  );
  const [summary, setSummary] = React.useState<LoungeReviews | null>(null);
  const [visits, setVisits] = React.useState<ReviewableVisit[]>([]);
  const [writing, setWriting] = React.useState(false);

  const refreshReviews = React.useCallback(async () => {
    const supabase = createClient();
    const [reviews, pending] = await Promise.all([
      fetchLoungeReviews(supabase, id),
      fetchReviewableVisits(supabase, id),
    ]);
    setSummary(reviews);
    setVisits(pending);
  }, [id]);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    Promise.all([
      fetchLoungeProfile(supabase, id),
      fetchLoungeReviews(supabase, id),
      fetchReviewableVisits(supabase, id),
    ]).then(([profile, reviews, pending]) => {
      if (!active) return;
      setLounge(profile);
      setSummary(reviews);
      setVisits(pending);
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (lounge === null) {
    notFound();
    return null;
  }

  if (!lounge || !summary) {
    return <AppShell padded={false}>{null}</AppShell>;
  }

  const reviewCount = summary.count;
  const reviews = summary.reviews;
  const badge =
    reviewCount === 0 ? (
      <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11.5px] font-bold text-fg">
        New on LuxePass
      </span>
    ) : undefined;

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <LoungeSubviewHeader
          lounge={lounge}
          backHref={`/lounges/${lounge.id}`}
          backLabel="Back to profile"
          address={`${lounge.neighborhood} · ${lounge.city} · ${lounge.address}`}
          badge={badge}
          hideFreshness
        />

        <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-6">
          <div className="h-fit w-[344px] shrink-0 rounded-content border border-line bg-surface p-5.5 shadow-content">
            <RatingSummary
              lounge={lounge}
              summary={summary}
              onWriteReview={visits.length > 0 ? () => setWriting(true) : undefined}
            />
            {writing ? (
              <WriteReviewDialog
                open
                onOpenChange={setWriting}
                loungeName={lounge.name}
                visits={visits}
                onPosted={refreshReviews}
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            {reviewCount === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  icon={Star}
                  title="No ratings yet"
                  description={`Be the first member to review ${lounge.name}. You can leave a rating once you have checked in and your visit is complete.`}
                  width={560}
                >
                  <div className="flex gap-3">
                    <Link
                      href={`/lounges/${lounge.id}/availability`}
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "lg" }),
                        "flex-1",
                      )}
                    >
                      See availability
                    </Link>
                    <Link
                      href={`/lounges/${lounge.id}/book`}
                      className={cn(buttonVariants({ size: "lg" }), "flex-1")}
                    >
                      Book a visit
                    </Link>
                  </div>
                </EmptyState>
              </div>
            ) : (
              <>
                <div className="mb-3.5 flex items-center justify-between">
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
                    Member reviews
                  </p>
                </div>

                <ul aria-label="Member reviews" className="m-0 flex list-none flex-col gap-3 p-0">
                  {reviews.map((review) => (
                    <li key={review.id}>
                      <ReviewCard review={review} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
