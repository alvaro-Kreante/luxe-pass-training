import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";
import { loadAdminAnalytics } from "@/lib/admin-analytics";
import { requireAdmin } from "@/lib/supabase/server";

/**
 * Story 8.2 — analítica de red (`Analytics.dc.html` de la Fase 8).
 * PERF-02: se carga en el servidor con el periodo por defecto.
 */
export default async function AnalyticsPage() {
  const supabase = await requireAdmin();
  return <AdminAnalyticsView {...await loadAdminAnalytics(supabase)} />;
}
