import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  mentionsFor,
  ratingBreakdownFor,
  reviewCountFor,
} from "@/lib/lounge-profile";
import type { Lounge } from "@/lib/lounges";

/**
 * Story 3.1 — "User ratings and review count (if available)".
 * `Reviews.dc.html`: cifra en Bodoni 44px, cinco estrellas, reparto por
 * estrella y las menciones frecuentes. `NoRatings.dc.html` lo sustituye por
 * un guion, estrellas vacías y una explicación — el resto de la pantalla lo
 * cubre `EmptyState` en la página.
 */
export function RatingSummary({ lounge }: { lounge: Lounge }) {
  const count = reviewCountFor(lounge);

  return (
    <div>
      <Eyebrow>Member rating</Eyebrow>

      <div className="mt-2.5 flex items-end gap-3">
        <h1 className="font-display text-[44px] leading-none text-fg">
          {count > 0 ? lounge.rating.toFixed(1) : "—"}
        </h1>
        <div className="pb-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                size={15}
                aria-hidden
                className={
                  count > 0 ? "fill-gold-500 text-gold-500" : "text-fg-subtle"
                }
                fill={count > 0 ? undefined : "none"}
              />
            ))}
          </div>
          <p className="m-0 mt-1.5 text-[12.5px] text-fg-subtle">
            {count > 0 ? `${count} member reviews` : "No reviews yet"}
          </p>
        </div>
      </div>

      {count > 0 ? (
        <>
          <div className="mt-5 flex flex-col gap-2">
            {ratingBreakdownFor(lounge).map((row) => (
              <div key={row.stars} className="flex items-center gap-2.5">
                <span className="w-5.5 text-xs font-semibold text-fg-muted">
                  {row.stars}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-blush-1">
                  <span
                    className="block h-1.5 rounded-[3px] bg-gold-500"
                    style={{ width: `${Math.round((row.count / count) * 100)}%` }}
                  />
                </span>
                <span className="w-6.5 text-right text-xs text-fg-subtle">
                  {row.count}
                </span>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-line" />

          <p className="m-0 mb-3 text-[12.5px] font-bold text-fg">
            What members mention
          </p>
          <div className="flex flex-wrap gap-2">
            {mentionsFor(lounge).map((mention) => (
              <span
                key={mention.label}
                className="rounded-pill border border-line px-4 py-2 text-[12.5px] font-semibold text-fg-muted"
              >
                {mention.label} {mention.count}
              </span>
            ))}
          </div>

          <Button variant="outline" block size="lg" className="mt-5.5">
            Write a review
          </Button>
        </>
      ) : (
        <p className="mt-5 text-[12.5px] leading-[1.6] text-fg-muted">
          {lounge.name} is new on LuxePass. Ratings appear here once members have
          reviewed a completed visit, so the rest of this profile is what to judge
          it on for now.
        </p>
      )}
    </div>
  );
}
