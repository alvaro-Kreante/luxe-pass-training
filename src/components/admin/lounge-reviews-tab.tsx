"use client";

import { Star } from "lucide-react";

import { StaffReviewsBoard } from "@/components/reviews/staff-reviews-board";
import { EmptyState } from "@/components/ui/empty-state";
import type { StaffReviews } from "@/lib/reviews";

/**
 * Story 3.1 — pestaña "Reviews" del detalle de un lounge
 * (`LoungeReviews.dc.html`, `LoungeReviewsEmpty.dc.html`, `LoungeReviewsMobile.dc.html`).
 * Solo lectura: el admin lee las reseñas, no las edita.
 */
export function LoungeReviewsTab({ loungeName, reviews }: { loungeName: string; reviews: StaffReviews | null }) {
  if (!reviews) return <p className="m-0 mt-6 text-[13px] text-fg-subtle">Loading…</p>;

  if (reviews.count === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description={`No member has reviewed a visit to ${loungeName} yet. Reviews arrive after a checked-in visit, each with its author and booking.`}
          footnote="Admins read reviews here; they cannot be edited from the console."
          width={520}
        />
      </div>
    );
  }

  return (
    <div className="mt-5.5 flex min-h-0 flex-1 flex-col">
      <StaffReviewsBoard data={reviews} variant="admin" />
    </div>
  );
}
