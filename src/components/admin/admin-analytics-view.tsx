"use client";

import * as React from "react";
import { CalendarDays, Download } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { MetricTile } from "@/components/ui/metric-tile";
import { Segmented } from "@/components/ui/segmented";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminAnalyticsData,
  type AnalyticsPeriod,
  dateRangeForPeriod,
  formatCurrency,
  formatDateRangeLabel,
  getBookingsByDay,
  getNetworkSummary,
  getRevenueByPartner,
  noShowRatePct,
  totalGrossRevenueCents,
} from "@/lib/admin-analytics";

/**
 * Story 8.2 — "No-show rate tracking", "Member acquisition and retention
 * metrics" y "Revenue reporting by partner and time period". Artboard:
 * docs/design/epic-8-admin-support/Analytics.dc.html.
 *
 * Backend real (22 sept 2026): `admin_network_summary`/
 * `admin_bookings_by_day`/`admin_revenue_by_partner`
 * (`supabase/schemas/admin_reports.sql`), sobre un rango relativo a `TODAY`.
 * La narrativa fija del mock (1,208 reservas, $336,250.00 brutos...) se
 * retira: la cifra real depende de lo que haya en la base al momento de
 * mirar la pantalla. "Net revenue"/"partner attribution" del mock asumían
 * una facturación de membresía que Epic 9 todavía no modela de verdad —
 * este panel muestra el ingreso bruto real (solo cargos succeeded de
 * Stripe) sin esa resta inventada. Desviación anotada en
 * `docs/design/COMPONENT-MAP.md`.
 *
 * PERF-02 — arranca con los datos del periodo por defecto que carga el
 * servidor (`loadAdminAnalytics`) y solo vuelve a pedir resumen, barras e
 * ingresos al cambiar de periodo.
 */
export function AdminAnalyticsView({
  period: initialPeriod,
  summary: initialSummary,
  byDay: initialByDay,
  revenue: initialRevenue,
  counts,
}: AdminAnalyticsData) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [period, setPeriod] = React.useState<AnalyticsPeriod>(initialPeriod);
  const [summary, setSummary] = React.useState(initialSummary);
  const [byDay, setByDay] = React.useState(initialByDay);
  const [revenue, setRevenue] = React.useState(initialRevenue);
  /** El periodo cuyos datos ya están en pantalla: el inicial llega del servidor. */
  const loadedPeriod = React.useRef(initialPeriod);

  const range = React.useMemo(() => dateRangeForPeriod(period), [period]);

  React.useEffect(() => {
    if (loadedPeriod.current === period) return;
    let active = true;
    Promise.all([
      getNetworkSummary(supabase, range),
      getBookingsByDay(supabase, range),
      getRevenueByPartner(supabase, range),
    ]).then(([summaryRow, dayRows, revenueRows]) => {
      if (!active) return;
      loadedPeriod.current = period;
      setSummary(summaryRow);
      setByDay(dayRows);
      setRevenue(revenueRows);
    });
    return () => {
      active = false;
    };
  }, [supabase, range, period]);

  const maxDay = Math.max(...byDay.map((d) => d.count), 1);
  const labelStep = Math.ceil(byDay.length / 14);
  const grossRevenueCents = totalGrossRevenueCents(revenue);
  const topPartners = [...revenue].sort((a, b) => b.grossRevenueCents - a.grossRevenueCents).slice(0, 5);

  return (
    <AdminShell
      topbarLabel={<span className="text-[13.5px] font-bold text-fg">Analytics</span>}
      topbarMeta="· Network overview"
      supportBadge={counts.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {formatDateRangeLabel(range)}
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
            <span className="text-[13.5px] font-semibold text-fg">{formatDateRangeLabel(range)}</span>
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
          value={summary.bookings.toLocaleString("en-US")}
          note={`${summary.attended.toLocaleString("en-US")} attended · ${summary.noShows} no-shows · ${summary.cancelled} cancelled`}
        />
        <MetricTile
          label="Active members"
          value={summary.activeMembers.toLocaleString("en-US")}
          note={`${summary.joined} joined, ${summary.left} left in the period`}
        />
        <MetricTile
          label="No-show rate"
          value={`${noShowRatePct(summary.noShows, summary.bookings)}%`}
          note={`${summary.noShows} of ${summary.bookings.toLocaleString("en-US")}`}
        />
        <MetricTile label="Gross revenue" value={formatCurrency(grossRevenueCents / 100)} note="real Stripe charges only" />
      </div>

      <div className="mt-4 flex min-h-0 gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Bookings per day</p>

            <div className={`mt-4 flex h-[158px] items-end ${byDay.length > 31 ? "gap-0.5" : "gap-2.5"}`}>
              {byDay.map((day, i) => {
                const showLabel = i % labelStep === 0;
                return (
                  <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                    <p className={`m-0 mb-1.5 whitespace-nowrap text-[11px] font-bold text-fg-subtle ${labelStep > 1 ? "invisible" : ""}`}>
                      {day.count}
                    </p>
                    <div
                      data-testid="daily-bar"
                      title={`${day.label}: ${day.count}`}
                      style={{ height: `${(day.count / maxDay) * 130}px` }}
                      className="w-full rounded-t-[6px] rounded-b-[3px] bg-accent"
                    />
                    <p className={`m-0 mt-1.5 whitespace-nowrap text-[10.5px] text-fg-subtle ${showLabel ? "" : "invisible"}`}>
                      {day.label}
                    </p>
                  </div>
                );
              })}
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

            <div className="mt-3.5 grid grid-cols-3 gap-3.5">
              <AcquisitionTile label="Joined" value={String(summary.joined)} />
              <AcquisitionTile label="Left" value={String(summary.left)} />
              <AcquisitionTile label="Net change" value={`${summary.joined - summary.left >= 0 ? "+" : ""}${summary.joined - summary.left}`} highlighted />
            </div>
          </div>
        </div>

        <div className="h-fit w-[344px] shrink-0 rounded-content border border-line bg-dark-card px-5.5 py-5">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Revenue by partner · {formatDateRangeLabel(range)}
          </p>

          {topPartners.map((line) => (
            <div key={line.loungeId} className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3 first:mt-2.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[12.5px] font-bold text-fg">{line.loungeName}</p>
                <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{line.bookings} bookings</p>
              </div>
              <p className="m-0 text-[13px] font-bold text-fg">{formatCurrency(line.grossRevenueCents / 100)}</p>
            </div>
          ))}

          <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-gold-600 bg-panel-black px-4 py-3.5">
            <p className="m-0 flex-1 text-[12.5px] font-bold text-fg">Gross revenue</p>
            <p className="m-0 font-display text-xl text-accent">{formatCurrency(grossRevenueCents / 100)}</p>
          </div>

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

/** Sin `value`, la cifra es una barra skeleton en su mismo párrafo (PERF-10). */
function AcquisitionTile({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-black px-3.5 py-3">
      <p className="m-0 text-[11px] text-fg-subtle">{label}</p>
      <p className={`m-0 mt-1.5 text-[19px] font-extrabold ${highlighted ? "text-accent" : "text-fg"}`}>
        {value}
      </p>
    </div>
  );
}
