import { TodayDashboard } from "@/components/partner/today-dashboard";

/**
 * Story 7.1 — Daily Guest Management (`Main.dc.html`). Story 7.2 —
 * "real-time updates" (`LiveUpdate.dc.html`). Ver `TodayDashboard` para la
 * implementación: un archivo de ruta del App Router solo puede exportar
 * `default`.
 */
export default function PartnerTodayPage() {
  return <TodayDashboard />;
}
