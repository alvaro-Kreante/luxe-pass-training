"use client";

import * as React from "react";
import { CalendarDays, Download } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { MetricTile } from "@/components/ui/metric-tile";
import { Segmented } from "@/components/ui/segmented";
import {
  ANALYTICS_PERIOD_LABEL,
  BOOKINGS_PER_DAY,
  MEMBER_ACQUISITION,
  NETWORK_METRICS,
  PARTNER_ATTRIBUTION_NOTE,
  REVENUE_LINES,
  formatCurrency,
} from "@/lib/admin-analytics";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";

type Period = "14d" | "month" | "quarter";

/**
 * Story 8.2 — "No-show rate tracking", "Member acquisition and retention
 * metrics" y "Revenue reporting by partner and time period". Artboard:
 * docs/design/epic-8-admin-support/Analytics.dc.html.
 *
 * El segmented "14 days / Month / Quarter" solo cambia su propia selección:
 * el catálogo de muestra solo modela la quincena del 1 al 14 de septiembre
 * (ver `lib/admin-analytics.ts`), así que no hay otro dataset que enseñar —
 * mismo criterio que el rango "Sep 1 – Sep 14" fijo del Epic 7.
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState<Period>("14d");

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Analytics</span>}
      topbarMeta={`· Network overview · figures settled to September 14`}
      supportBadge={ADMIN_CASE_COUNTS.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {ANALYTICS_PERIOD_LABEL} · 12 lounges · 3 cities
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">How the network is doing</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Segmented
            label="Period"
            size="sm"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "14d", label: "14 days" },
              { value: "month", label: "Month" },
              { value: "quarter", label: "Quarter" },
            ]}
          />
          <span className="flex h-11 items-center gap-2.5 rounded-[11px] border-[1.5px] border-line px-4">
            <CalendarDays size={17} strokeWidth={1.7} className="text-accent" aria-hidden />
            <span className="text-[13.5px] font-semibold text-fg">Sep 1 – Sep 14</span>
          </span>
          <button
            type="button"
            onClick={() => router.push("/admin/reports")}
            className="flex h-11 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line px-4.5 transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            <Download size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <span className="text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="mt-4.5 grid grid-cols-4 gap-3.5">
        <MetricTile
          label="Bookings"
          value={NETWORK_METRICS.bookings.toLocaleString("en-US")}
          note={`${NETWORK_METRICS.attended.toLocaleString("en-US")} attended · ${NETWORK_METRICS.noShows} no-shows · ${NETWORK_METRICS.cancelled} cancelled`}
        />
        <MetricTile
          label="Active members"
          value={NETWORK_METRICS.activeMembers.toLocaleString("en-US")}
          note={`${NETWORK_METRICS.joined} joined, ${NETWORK_METRICS.left} left in the period`}
        />
        <MetricTile
          label="No-show rate"
          value={`${NETWORK_METRICS.noShowRatePct}%`}
          note={`${NETWORK_METRICS.noShows} of ${NETWORK_METRICS.bookings.toLocaleString("en-US")} · ${NETWORK_METRICS.noShowRatePrevPct}% in the fortnight before`}
        />
        <MetricTile
          label="Net revenue"
          value={formatCurrency(NETWORK_METRICS.netRevenue)}
          note={`after ${formatCurrency(NETWORK_METRICS.partnerAttribution)} attributed to partners`}
        />
      </div>

      <div className="mt-4 flex min-h-0 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <div className="flex items-center gap-3">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Bookings per day</p>
                <p className="m-0 mt-1.5 text-[12.5px] text-fg-muted">
                  The fourteen bars add up to the {NETWORK_METRICS.bookings.toLocaleString("en-US")} in the tile
                  above.
                </p>
              </div>
              <div className="flex-1" />
              <span className="rounded-pill border border-line px-3.5 py-1.5 text-[11.5px] font-bold text-fg-muted">
                Weekends run lighter
              </span>
            </div>

            <div className="mt-4 flex h-[158px] items-end gap-2.5">
              {BOOKINGS_PER_DAY.map((day) => (
                <div key={day.label} className="flex flex-1 flex-col items-center justify-end">
                  <p className="m-0 mb-1.5 text-[11px] font-bold text-fg-subtle">{day.count}</p>
                  <div
                    data-testid="daily-bar"
                    style={{ height: `${(day.count / 97) * 130}px` }}
                    className="w-full rounded-t-[6px] rounded-b-[3px] bg-accent"
                  />
                  <p className="m-0 mt-1.5 text-[10.5px] text-fg-subtle">{day.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <div className="flex items-center gap-3">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Members</p>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => router.push("/admin/reports?dataset=members")}
                className="text-[11.5px] font-bold text-accent-strong"
              >
                Open the acquisition report
              </button>
            </div>

            <div className="mt-3.5 grid grid-cols-4 gap-3.5">
              <AcquisitionTile label="Joined" value={String(MEMBER_ACQUISITION.joined)} />
              <AcquisitionTile label="Cancelled" value={String(MEMBER_ACQUISITION.cancelled)} />
              <AcquisitionTile label="Net change" value={`+${MEMBER_ACQUISITION.netChange}`} highlighted />
              <AcquisitionTile label="Churn in period" value={`${MEMBER_ACQUISITION.churnPct}%`} />
            </div>

            <div className="mt-3.5 flex items-center gap-3.5">
              <p className="m-0 w-[190px] text-[12.5px] font-bold text-fg-muted">Twelve-month retention</p>
              <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-panel-black">
                <div
                  className="h-2.5 rounded-pill bg-accent"
                  style={{ width: `${MEMBER_ACQUISITION.retentionPct}%` }}
                />
              </div>
              <p className="m-0 w-11 text-right text-[13px] font-extrabold text-fg">
                {MEMBER_ACQUISITION.retentionPct}%
              </p>
            </div>
          </div>
        </div>

        <div className="h-fit w-[344px] shrink-0 rounded-content border border-line bg-dark-card px-5.5 py-5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Revenue · {ANALYTICS_PERIOD_LABEL}
          </p>

          {REVENUE_LINES.map((line) => (
            <div key={line.label} className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3 first:mt-2.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[12.5px] font-bold text-fg">{line.label}</p>
                <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{line.detail}</p>
              </div>
              <p className="m-0 text-[13px] font-bold text-fg">{formatCurrency(line.amount)}</p>
            </div>
          ))}

          <div className="flex items-center gap-3 border-t border-line py-3">
            <p className="m-0 flex-1 text-[12.5px] font-bold text-fg-muted">Gross</p>
            <p className="m-0 text-[13px] font-bold text-fg-muted">{formatCurrency(NETWORK_METRICS.grossRevenue)}</p>
          </div>
          <div className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[12.5px] font-bold text-fg">Attributed to partners</p>
              <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{PARTNER_ATTRIBUTION_NOTE}</p>
            </div>
            <p className="m-0 text-[13px] font-bold text-fg-muted">
              −{formatCurrency(NETWORK_METRICS.partnerAttribution)}
            </p>
          </div>

          <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 flex-1 text-[12.5px] font-bold text-fg">Net to LuxePass</p>
            <p className="m-0 font-display text-xl text-accent">{formatCurrency(NETWORK_METRICS.netRevenue)}</p>
          </div>

          <p className="mt-3.5 text-[11.5px] text-fg-subtle">
            Partner attribution follows each agreement: the whole day pass, $38.00 per membership visit and half of
            every no-show fee. The Ainsworth&apos;s $8,616.50 is the largest single share.
          </p>

          <button
            type="button"
            onClick={() => router.push("/admin/reports?dataset=revenue-by-partner")}
            className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            <Download size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            <span className="text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">Revenue by partner (CSV)</span>
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

function AcquisitionTile({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-black px-3.5 py-3">
      <p className="m-0 text-[11px] text-fg-subtle">{label}</p>
      <p className={`m-0 mt-1.5 text-[19px] font-extrabold ${highlighted ? "text-accent" : "text-fg"}`}>{value}</p>
    </div>
  );
}
