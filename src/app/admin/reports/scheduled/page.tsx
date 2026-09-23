"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  EXPORT_DATASETS,
  cadenceLabel,
  listScheduledReports,
  toggleScheduledReport,
  type ScheduledReport,
} from "@/lib/admin-analytics";

/**
 * Story 8.2 — "Automated daily/weekly report generation" y "Scheduled email
 * delivery of reports". Artboard:
 * docs/design/epic-8-admin-support/ScheduledReports.dc.html.
 *
 * Backend real (22 sept 2026): tabla `scheduled_reports` +
 * `dispatch_scheduled_reports` (`pg_cron`, cada 15 min,
 * `supabase/schemas/admin_reports.sql`) → Edge Function `send-admin-report`.
 * "New report" sigue enlazando a `/admin/reports?delivery=schedule` — cada
 * reporte programado nace de un export guardado con "Save as a scheduled
 * report", no de un formulario propio. El rail "Delivered in the last 24
 * hours" del mock no tiene contraparte real (no hay tabla de historial de
 * entregas) — se retira, desviación anotada en `docs/design/COMPONENT-MAP.md`.
 */
export default function ScheduledReportsPage() {
  return (
    <RequireAdminSession>
      <ScheduledReportsScreen />
    </RequireAdminSession>
  );
}

function datasetLabel(dataset: ScheduledReport["dataset"]): string {
  return EXPORT_DATASETS.find((d) => d.value === dataset)?.label ?? dataset;
}

function formatRunLabel(iso: string | null): string {
  if (!iso) return "never run yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function ScheduledReportsScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [reports, setReports] = React.useState<ScheduledReport[] | null>(null);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);

  React.useEffect(() => {
    let active = true;
    listScheduledReports(supabase).then((rows) => {
      if (active) setReports(rows);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function toggle(id: string, enabled: boolean) {
    setReports((current) => current?.map((r) => (r.id === id ? { ...r, enabled } : r)) ?? current);
    await toggleScheduledReport(supabase, id, enabled);
  }

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link
            href="/admin/reports"
            className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent"
          >
            Reports
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">Scheduled</span>
        </>
      }
      supportBadge={counts?.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {(reports ?? []).length} reports · {(reports ?? []).filter((r) => r.enabled).length} running · all
            delivered by email
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Reports that send themselves</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push("/admin/reports?delivery=schedule")}
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-accent px-5 transition-colors duration-150 hover:bg-accent-strong"
          >
            <Plus size={16} strokeWidth={2} className="text-on-accent" aria-hidden />
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-on-accent">New report</span>
          </button>
        </div>
      </div>

      <div className="mt-4.5 overflow-hidden rounded-content border border-line bg-dark-card">
        <div
          className="grid grid-cols-[1fr_160px_158px_158px_54px] items-center gap-3.5 border-b border-line px-5.5"
          style={{ height: 42 }}
        >
          <Th>Report</Th>
          <Th>Runs</Th>
          <Th>Next</Th>
          <Th>Last run</Th>
          <Th className="text-right">On</Th>
        </div>

        {(reports ?? []).map((report) => (
          <div
            key={report.id}
            className="grid grid-cols-[1fr_160px_158px_158px_54px] items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 last:border-b-0"
            style={{ height: 62 }}
          >
            <div className="min-w-0">
              <p className="m-0 text-[13.5px] font-bold text-fg">{report.name}</p>
              <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{datasetLabel(report.dataset)}</p>
            </div>
            <p className="m-0 text-[12.5px] text-fg-muted">{cadenceLabel(report.cadence)}</p>
            <p className="m-0 text-[12.5px] text-fg-muted">{formatRunLabel(report.nextRunAt)}</p>
            <p className="m-0 text-[12.5px] text-fg-muted">{formatRunLabel(report.lastRunAt)}</p>
            <div className="flex justify-end">
              <Switch checked={report.enabled} onCheckedChange={(checked) => toggle(report.id, checked)} label={report.name} />
            </div>
          </div>
        ))}

        {reports && reports.length === 0 ? (
          <p className="px-5.5 py-6 text-[13px] text-fg-subtle">No scheduled reports yet.</p>
        ) : null}
      </div>

      <p className="mt-3.5 text-xs text-fg-subtle">
        Every scheduled report is one of the exports on the previous screen, saved with its cadence. A cron job checks
        every 15 minutes for what is due and emails it out for real.
      </p>
    </AdminShell>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle ${className ?? ""}`}>
      {children}
    </p>
  );
}
