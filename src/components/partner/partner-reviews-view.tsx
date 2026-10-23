"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { PartnerContextProvider, usePartnerContext } from "@/components/partner/partner-context";
import { PartnerShell } from "@/components/patterns/partner-shell";
import { StaffReviewsBoard } from "@/components/reviews/staff-reviews-board";
import { EmptyState } from "@/components/ui/empty-state";
import type { PartnerReviewsData } from "@/lib/partner";
import { analyticsLoungeId } from "@/lib/partner-lounges";
import { fetchPartnerReviews } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 3.1 — reseñas de los lounges del partner, solo lectura.
 * `PartnerReviews.dc.html` / `PartnerReviewsEmpty.dc.html` /
 * `PartnerReviewsMobile.dc.html` (Fase 2), sobre el patrón 15. Con "All
 * lounges" cada reseña dice de qué lounge es.
 *
 * PERF-02 — arranca con los datos del lounge elegido, cargados en el
 * servidor (`loadPartnerReviews`); solo vuelve a pedirlos al cambiar de
 * lounge en la cabecera.
 */
export function PartnerReviewsView({ context, ...data }: PartnerReviewsData) {
  return (
    <PartnerContextProvider initialContext={context}>
      <ReviewsContent {...data} />
    </PartnerContextProvider>
  );
}

function ReviewsContent({ loungeId: initialLoungeId, reviews: initialReviews }: Omit<PartnerReviewsData, "context">) {
  const supabase = React.useMemo(() => createClient(), []);
  const partner = usePartnerContext();
  const context = partner?.context ?? null;
  const loungeId = analyticsLoungeId(context);
  const [reviews, setReviews] = React.useState(initialReviews);
  const loadedLoungeId = React.useRef(initialLoungeId);

  React.useEffect(() => {
    if (loadedLoungeId.current === loungeId) return;
    let active = true;
    fetchPartnerReviews(supabase, loungeId).then((next) => {
      if (!active) return;
      loadedLoungeId.current = loungeId;
      setReviews(next);
    });
    return () => {
      active = false;
    };
  }, [supabase, loungeId]);

  const scope = loungeId
    ? (context?.lounges.find((lounge) => lounge.id === loungeId)?.name ?? "This lounge")
    : "All lounges";

  return (
    <PartnerShell
      allowAllLounges
      topbarLabel="Reviews"
      topbarMeta={`· ${context?.partner.name ?? ""} · read only`}
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        {scope} · {reviews.count > 0 ? "every review since you joined" : "no reviewed visits yet"}
      </p>
      <h1 className="mt-2 text-[34px] text-fg">What members say</h1>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        {reviews.count > 0 ? (
          <StaffReviewsBoard data={reviews} variant="partner" />
        ) : (
          <div className="flex flex-1 items-center justify-center py-10">
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Members can review a visit once they have checked in. Each rating, comment and the booking it belongs to will appear here."
              footnote="Read only — members write reviews, nobody edits them."
              width={520}
            />
          </div>
        )}
      </div>
    </PartnerShell>
  );
}
