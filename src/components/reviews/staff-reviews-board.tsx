import Link from "next/link";
import { Star } from "lucide-react";

import { formatVisitDate, type StaffReview, type StaffReviews } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — reseñas de solo lectura para el personal, tema oscuro.
 * PartnerReviews.dc.html (Fase 2) y LoungeReviews.dc.html (Fase 8)
 * comparten la misma anatomía: columna de 340px con la nota media, el
 * reparto por estrellas y "What members mention", y la lista de reseñas con
 * su visita. El partner ve el lounge de cada reseña; el admin, el nombre
 * completo y "View member".
 */
export function StaffReviewsBoard({
  data,
  variant,
}: {
  data: StaffReviews;
  variant: "partner" | "admin";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <section aria-label="Rating summary" className="flex w-full shrink-0 flex-col gap-4 lg:w-[340px]">
        <div className="rounded-[20px] border border-line bg-dark-card px-6 py-5.5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Average rating</p>
          <div className="mt-2.5 flex items-end gap-3.5">
            <p className="m-0 font-display text-[56px] leading-none text-fg">{data.rating.toFixed(1)}</p>
            <div className="pb-1.5">
              <Stars value={Math.round(data.rating)} label={`${data.rating.toFixed(1)} out of 5`} size={16} />
              <p className="m-0 mt-1.5 text-[11.5px] text-fg-subtle">
                From {data.count} reviewed {data.count === 1 ? "visit" : "visits"}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            {data.breakdown.map((row) => (
              <div key={row.stars} className="flex items-center gap-2.5">
                <span className="w-5.5 text-xs font-semibold text-fg-muted">{row.stars}★</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-[5px] bg-panel-black">
                  <span
                    className="block h-2.5 rounded-[5px] bg-gold-500"
                    style={{ width: `${Math.round((row.count / data.count) * 100)}%` }}
                  />
                </span>
                <span className="w-7 text-right text-xs text-fg-subtle">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        {data.mentions.length > 0 ? (
          <div className="rounded-[20px] border border-line bg-dark-card px-6 py-5">
            <p className="m-0 text-[13px] font-bold text-fg">What members mention</p>
            <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">Picked by members when they review</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {data.mentions.map((mention) => (
                <span
                  key={mention.label}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3.5 py-2 text-xs font-semibold text-fg-muted"
                >
                  {mention.label} <span className="font-extrabold text-gold-500">{mention.count}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section
        aria-label="Reviews"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-line bg-dark-card"
      >
        <div className="flex h-11.5 shrink-0 items-center border-b border-line px-6">
          <p className="m-0 flex-1 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {data.count} {data.count === 1 ? "review" : "reviews"} · newest first
          </p>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Rating</p>
        </div>
        <ul aria-label="Member reviews" className="m-0 min-h-0 flex-1 list-none overflow-auto p-0">
          {data.reviews.map((review) => (
            <li key={review.id}>
              <ReviewRow review={review} variant={variant} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ReviewRow({ review, variant }: { review: StaffReview; variant: "partner" | "admin" }) {
  return (
    <article className="flex gap-3.5 border-b border-line/60 px-6 py-4.5">
      <div
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-600 bg-gold-500/15 text-[11.5px] font-extrabold text-gold-500"
      >
        {review.initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="m-0 min-w-0 flex-1 text-[13.5px] font-bold text-fg">
            {review.name} <span className="text-xs font-medium text-fg-subtle">· {review.tier}</span>
          </p>
          <Stars value={review.rating} label={`${review.rating} out of 5`} size={14} />
        </div>
        <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
          Visited {formatVisitDate(review.visitedOn)}
          {variant === "partner" ? (
            <>
              {review.loungeName ? ` · ${review.loungeName}` : null} ·{" "}
              <span className="font-bold tracking-[0.04em] text-fg-muted">{review.reference}</span>
            </>
          ) : (
            <>
              {" "}
              · booking <span className="font-bold tracking-[0.04em] text-fg-muted">{review.reference}</span>
              {review.memberId ? (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/admin/members/${review.memberId}`} className="text-accent hover:underline">
                    View member
                  </Link>
                </>
              ) : null}
            </>
          )}
        </p>
        {review.text ? (
          <p className="m-0 mt-2.5 text-[13px] leading-[1.6] text-fg-muted">{review.text}</p>
        ) : (
          <p className="m-0 mt-2.5 text-[12.5px] italic text-fg-subtle">Rated without a comment</p>
        )}
        {review.mentions.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {review.mentions.map((mention) => (
              <span key={mention} className="rounded-pill border border-line px-2.5 py-1 text-[11px] font-semibold text-fg-subtle">
                {mention}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function Stars({ value, label, size }: { value: number; label: string; size: number }) {
  return (
    <div role="img" aria-label={label} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.4}
          aria-hidden
          className={cn(star <= value ? "fill-gold-500 text-gold-500" : "text-fg-subtle")}
        />
      ))}
    </div>
  );
}
