"use client";

import * as React from "react";
import { AlertTriangle, CheckCheck, History, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { Switch } from "@/components/ui/switch";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";
import { RECENT_DELIVERIES, SCHEDULED_REPORTS } from "@/lib/admin-analytics";

/**
 * Story 8.2 — "Automated daily/weekly report generation" y "Scheduled email
 * delivery of reports". Artboard:
 * docs/design/epic-8-admin-support/ScheduledReports.dc.html.
 *
 * "New report" no abre un formulario propio: cada reporte programado es un
 * export guardado (`Export.dc.html` con "Save as a scheduled report"), así
 * que enlaza allí en vez de duplicar el formulario.
 */
export default function ScheduledReportsPage() {
  const router = useRouter();
  const [reports, setReports] = React.useState(SCHEDULED_REPORTS);

  function toggle(id: string) {
    setReports((current) =>
      current.map((report) => (report.id === id ? { ...report, enabled: !report.enabled } : report)),
    );
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
      supportBadge={ADMIN_CASE_COUNTS.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {reports.length} reports · {reports.filter((r) => r.enabled).length} running · all delivered by email
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Reports that send themselves</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line px-4.5 transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            <History size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <span className="text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">Delivery history</span>
          </button>
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

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-content border border-line bg-dark-card">
            <div
              className="grid grid-cols-[1fr_160px_106px_158px_54px] items-center gap-3.5 border-b border-line px-5.5"
              style={{ height: 42 }}
            >
              <Th>Report</Th>
              <Th>Runs</Th>
              <Th>Format</Th>
              <Th>Next</Th>
              <Th className="text-right">On</Th>
            </div>

            {reports.map((report) => (
              <div
                key={report.id}
                className="grid grid-cols-[1fr_160px_106px_158px_54px] items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 last:border-b-0"
                style={{ height: 62 }}
              >
                <div className="min-w-0">
                  <p className="m-0 text-[13.5px] font-bold text-fg">{report.name}</p>
                  <p className="m-0 mt-0.5 truncate text-[11.5px] text-fg-subtle">{report.detail}</p>
                </div>
                <p className="m-0 text-[12.5px] text-fg-muted">{report.cadenceLabel}</p>
                <p className="m-0 text-[12.5px] text-fg-muted">{report.format}</p>
                <div>
                  <p className="m-0 text-[12.5px] font-bold text-fg">{report.nextRunLabel}</p>
                  <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{report.lastRunLabel}</p>
                </div>
                <div className="flex justify-end">
                  <Switch checked={report.enabled} onCheckedChange={() => toggle(report.id)} label={report.name} />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3.5 text-xs text-fg-subtle">
            Every scheduled report is one of the exports on the previous screen, saved with its filters and columns.
            Personal columns cannot be scheduled — a report that needs names has to be run by hand, with a reason.
          </p>
        </div>

        <div className="h-fit w-[344px] shrink-0 rounded-content border border-line bg-dark-card px-5.5 py-5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Delivered in the last 24 hours
          </p>
          {RECENT_DELIVERIES.map((delivery, index) => (
            <div
              key={`${delivery.reportName}-${index}`}
              className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3.5 first:mt-2.5"
            >
              <span
                className={`flex size-8.5 shrink-0 items-center justify-center rounded-[10px] ${
                  delivery.failed
                    ? "border border-dashed border-fg-subtle bg-panel-black"
                    : "border border-gold-600 bg-[rgba(201,168,118,0.16)]"
                }`}
              >
                {delivery.failed ? (
                  <AlertTriangle size={16} strokeWidth={1.9} className="text-fg-muted" aria-hidden />
                ) : (
                  <CheckCheck size={16} strokeWidth={1.9} className="text-accent" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[12.5px] font-bold text-fg">{delivery.reportName}</p>
                <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{delivery.detail}</p>
              </div>
            </div>
          ))}

          <div className="mt-4 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 text-[11.5px] text-fg-muted">
              A delivery that fails is retried twice, twenty minutes apart. If it still fails, the console opens a
              case so somebody notices before the recipients do.
            </p>
          </div>
        </div>
      </div>
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
