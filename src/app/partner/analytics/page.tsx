import { PartnerAnalyticsView } from "@/components/partner/partner-analytics-view";
import { loadPartnerAnalytics } from "@/lib/partner";
import { requirePartner } from "@/lib/supabase/server";

/**
 * Story 7.3 — Partner Analytics (`Analytics.dc.html` de la Fase 2).
 * PERF-02: se carga en el servidor con el lounge elegido del partner.
 */
export default async function AnalyticsPage() {
  const { supabase, context } = await requirePartner();
  return <PartnerAnalyticsView {...await loadPartnerAnalytics(supabase, context)} />;
}
