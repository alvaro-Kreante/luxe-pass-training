"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Star } from "lucide-react";

import { LoungeSubviewHeader } from "@/components/lounges/lounge-subview-header";
import { RatingSummary } from "@/components/lounges/rating-summary";
import { ReviewCard } from "@/components/lounges/review-card";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { contactFor, reviewCountFor, reviewsFor } from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — "User ratings and review count (if available)".
 * Sub-vista de lounge (DESIGN-SYSTEM.md §5 patrón 8).
 * Artboards: `Reviews.dc.html` y `NoRatings.dc.html`.
 */
export default function ReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const lounge = LOUNGES.find((candidate) => candidate.id === id);

  if (!lounge) {
    notFound();
    return null;
  }

  const contact = contactFor(lounge);
  const reviewCount = reviewCountFor(lounge);
  const reviews = reviewsFor(lounge);
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
          address={`${lounge.neighborhood} · ${lounge.city} · ${contact.address}`}
          badge={badge}
        />

        <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-6">
          <div className="h-fit w-[344px] shrink-0 rounded-content border border-line bg-surface p-5.5 shadow-content">
            <RatingSummary lounge={lounge} />
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

                <div className="flex flex-col gap-3">
                  {reviews.map((review) => (
                    <ReviewCard key={review.name} review={review} />
                  ))}
                </div>

                <p className="m-0 mt-4 text-[12.5px] text-fg-subtle">
                  Showing {reviews.length} of {reviewCount} reviews
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
