import { Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { LoungeReview } from "@/lib/lounge-profile";

/** Story 3.1 — una reseña de `Reviews.dc.html`: avatar, autor, estrellas y texto. */
export function ReviewCard({ review }: { review: LoungeReview }) {
  return (
    <Card variant="content" className="border border-line p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-on-accent">
          {review.initials}
        </span>
        <div className="flex-1">
          <p className="m-0 text-[13.5px] font-bold text-fg">{review.name}</p>
          <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
            {review.tier} · Visited {review.visitedOn}
          </p>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={14}
              aria-hidden
              className={
                index < review.rating
                  ? "fill-gold-500 text-gold-500"
                  : "text-line"
              }
              fill={index < review.rating ? undefined : "none"}
            />
          ))}
        </div>
      </div>
      <p className="m-0 mt-3.5 text-[13px] leading-[1.6] text-fg-muted">
        {review.text}
      </p>
    </Card>
  );
}
