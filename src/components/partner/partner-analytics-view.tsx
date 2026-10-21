"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { PartnerContextProvider, usePartnerContext } from "@/components/partner/partner-context";
import { PartnerShell } from "@/components/patterns/partner-shell";
import { MetricTile } from "@/components/ui/metric-tile";
import { Segmented } from "@/components/ui/segmented";
import { today } from "@/lib/availability";
import { downloadTextFile } from "@/lib/download";
import {
  type AnalyticsRange,
  type PartnerAnalyticsData,
  PARTNER_ANALYTICS_RANGE_DAYS as RANGE_DAYS,
  bookingsByWeekday,
  fetchPartnerAnalytics,
  formatCurrency,
  revenueBreakdownFor,
  revenueBreakdownToCsv,
  totalRevenueAttributed,
} from "@/lib/partner";
import { analyticsLoungeId } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 7.3 — Partner Analytics. DESIGN-SYSTEM.md §5 patrón 19 (vista de
 * analítica, sobre el patrón 15). Artboard: Analytics.dc.html.
 *
 * Backend real (22 sept 2026): `partner_analytics_summary`/
 * `partner_bookings_by_day` (`supabase/schemas/partner_analytics.sql`)
 * agregan sobre los lounges reales del partner autenticado: el elegido en la
 * cabecera o todos con "All lounges" (Story 10.6, PartnerAnalyticsAll 15). "When they come" ya no es
 * un dato de muestra: se deriva sumando la misma serie diaria por día de la
 * semana (`bookingsByWeekday`).
 *
 * PERF-02 — arranca con el contexto del partner y los datos de su lounge
 * elegido, cargados en el servidor (`loadPartnerAnalytics`); solo vuelve a
 * pedirlos al cambiar de lounge en la cabecera.
 */
export function PartnerAnalyticsView({ context, ...data }: PartnerAnalyticsData) {
  return (
    <PartnerContextProvider initialContext={context}>
      <AnalyticsContent {...data} />
    </PartnerContextProvider>
  );
}

function AnalyticsContent({
  loungeId: initialLoungeId,
  summary: initialSummary,
  dailySeries: initialSeries,
}: Omit<PartnerAnalyticsData, "context">) {
  const supabase = React.useMemo(() => createClient(), []);
  const [range, setRange] = React.useState<AnalyticsRange>("month");
  const [summary, setSummary] = React.useState(initialSummary);
  const [dailySeries, setDailySeries] = React.useState(initialSeries);
  const loungeId = analyticsLoungeId(usePartnerContext()?.context ?? null);
  /** El lounge cuyos datos están en pantalla: el inicial llega del servidor. */
  const loadedLoungeId = React.useRef(initialLoungeId);

  React.useEffect(() => {
    if (loadedLoungeId.current === loungeId) return;
    let active = true;
    fetchPartnerAnalytics(supabase, loungeId).then((next) => {
      if (!active) return;
      loadedLoungeId.current = loungeId;
      setSummary(next.summary);
      setDailySeries(next.dailySeries);
    });
    return () => {
      active = false;
    };
  }, [supabase, loungeId]);

  const seriesForRange = range === "week" ? dailySeries.slice(-7) : dailySeries;
  const arrivalsByWeekday = bookingsByWeekday(dailySeries);
  const maxWeekday = Math.max(1, ...arrivalsByWeekday.map((d) => d.guests));
  const guestsWhoArrived = summary.day_pass_visits + summary.membership_visits;
  const revenueBreakdown = revenueBreakdownFor(summary);
  const totalRevenue = totalRevenueAttributed(revenueBreakdown);
  const keptPct = summary.bookings === 0 ? 0 : Math.round((guestsWhoArrived / summary.bookings) * 1000) / 10;
  const noShowPct = summary.bookings === 0 ? 0 : Math.round((summary.no_shows / summary.bookings) * 1000) / 10;
  const averagePerDay = dailySeries.length === 0 ? 0 : summary.bookings / dailySeries.length;

  return (
    <PartnerShell
      allowAllLounges
      topbarLabel="Analytics"
      topbarMeta={`· Last ${RANGE_DAYS} days`}
      topbarRight={
        <div className="flex items-center gap-2.5">
          <Segmented
            label="Range"
            value={range}
            onChange={setRange}
            size="sm"
            className="w-44"
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-[11px] border-[1.5px] border-line px-4 text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            <Download size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            Download report
          </button>
        </div>
      }
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        Last {RANGE_DAYS} days
      </p>
      <h1 className="mt-2 text-[34px] text-fg">How things are going</h1>

      <div className="mt-5 grid grid-cols-4 gap-3.5">
        <MetricTile label="Bookings" value={String(summary.bookings)} note={`Over the last ${RANGE_DAYS} days`} />
        <MetricTile
          label="Guests who arrived"
          value={String(guestsWhoArrived)}
          note={`${keptPct}% of bookings kept`}
        />
        <MetricTile
          label="No-shows"
          value={String(summary.no_shows)}
          note={`${noShowPct}% · plus ${summary.cancellations} cancellations`}
        />
        <MetricTile
          label="Attributed to LuxePass"
          value={formatCurrency(totalRevenue)}
          note="Statements issued monthly"
        />
      </div>

      <div className="mt-4 flex gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-content border border-line bg-dark-card p-5">
            <p className="m-0 text-sm font-bold text-fg">Bookings a day</p>
            <p className="m-0 mt-1 text-xs text-fg-subtle">
              Last {RANGE_DAYS} days · {averagePerDay.toFixed(1)} a day on average
            </p>
            <div className="mt-5 flex h-[140px] items-end gap-2">
              {seriesForRange.map((point) => {
                const isToday = point.day === today();
                const dayNumber = new Date(`${point.day}T00:00:00Z`).getUTCDate();
                return (
                  <div key={point.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className={cn("text-[11px] font-bold", isToday ? "text-accent" : "text-fg-subtle")}>
                      {point.bookings}
                    </span>
                    <div
                      data-testid="daily-bar"
                      style={{ height: `${point.bookings * 5}px` }}
                      className={cn(
                        "w-full rounded-t-[6px] rounded-b-[3px]",
                        isToday ? "border-[1.5px] border-dashed border-accent bg-transparent" : "bg-accent",
                      )}
                    />
                    <span className={cn("text-[10.5px]", isToday ? "text-accent" : "text-fg-subtle")}>
                      {dayNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card p-5">
            <p className="m-0 text-sm font-bold text-fg">When they come</p>
            <p className="m-0 mt-1 text-xs text-fg-subtle">
              Arrivals by day of the week · last {RANGE_DAYS} days
            </p>
            <div className="mt-4 flex flex-col">
              {arrivalsByWeekday.map((day) => (
                <div key={day.day} className="flex items-center gap-3 border-b border-[rgba(58,50,42,0.6)] py-1.75 last:border-b-0">
                  <span className="w-9 shrink-0 text-xs font-bold text-fg-muted">{day.day}</span>
                  <div className="h-2.25 flex-1 rounded-pill bg-panel-black">
                    <div
                      className="h-2.25 rounded-pill bg-accent"
                      style={{ width: `${(day.guests / maxWeekday) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-fg-subtle">{day.guests} guests</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-86 shrink-0 rounded-content border border-line bg-dark-card p-5.5">
          <p className="m-0 text-sm font-bold text-fg">Where the money comes from</p>
          <p className="m-0 mt-1 text-xs text-fg-subtle">{guestsWhoArrived} guests who actually arrived</p>

          <RevenueRow
            label="Day passes"
            note={`${summary.day_pass_visits} visits · as charged`}
            amount={formatCurrency(revenueBreakdown.dayPasses)}
          />
          <RevenueRow
            label="Membership visits"
            note={`${summary.membership_visits} visits · covered by membership`}
            amount={formatCurrency(revenueBreakdown.membershipVisits)}
          />
          <RevenueRow
            label="No-show fees"
            note={`${summary.no_shows} no-shows · fees recorded`}
            amount={formatCurrency(revenueBreakdown.noShowFees)}
            last
          />

          <div className="mt-4 flex items-center justify-between rounded-[14px] border border-gold-600 bg-panel-black p-4">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
                Attributed to LuxePass
              </p>
              <h3 className="mt-1.5 font-display text-[27px] text-fg">
                {formatCurrency(totalRevenue)}
              </h3>
            </div>
          </div>

          <p className="m-0 mt-4 text-[11.5px] leading-[1.6] text-fg-subtle">
            Amounts are what guests were actually charged. Statements are issued on the 5th for the
            month before.
          </p>

          <button
            type="button"
            onClick={() => downloadTextFile("partner-revenue.csv", revenueBreakdownToCsv(summary))}
            className="mt-4 flex h-11.5 w-full items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:bg-surface-hover"
          >
            <Download size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
            Download revenue CSV
          </button>
        </div>
      </div>
    </PartnerShell>
  );
}

function RevenueRow({
  label,
  note,
  amount,
  last = false,
}: {
  label: string;
  note: string;
  amount: string;
  last?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between py-3.25", !last && "border-b border-[rgba(58,50,42,0.6)]")}>
      <div>
        <p className="m-0 text-[13px] font-bold text-fg">{label}</p>
        <p className="m-0 mt-0.5 text-xs text-fg-subtle">{note}</p>
      </div>
      <p className="m-0 font-display text-base text-fg">{amount}</p>
    </div>
  );
}
