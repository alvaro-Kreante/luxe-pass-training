import { PartnerReviewsView } from "@/components/partner/partner-reviews-view";
import { loadPartnerReviews } from "@/lib/partner";
import { requirePartner } from "@/lib/supabase/server";

/**
 * Story 3.1 — reseñas de los lounges del partner, solo lectura
 * (`PartnerReviews.dc.html` de la Fase 2). PERF-02: se carga en el servidor
 * con el lounge elegido del partner.
 */
export default async function PartnerReviewsPage() {
  const { supabase, context } = await requirePartner();
  return <PartnerReviewsView {...await loadPartnerReviews(supabase, context)} />;
}
