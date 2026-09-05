"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { PartnerShell } from "@/components/patterns/partner-shell";
import { Segmented } from "@/components/ui/segmented";
import { MetricTile } from "@/components/ui/metric-tile";
import {
  ANALYTICS_SUMMARY,
  ARRIVALS_BY_WEEKDAY,
  GUESTS_WHO_ARRIVED,
  MONTHLY_BOOKINGS_TOTAL,
  REVENUE_BREAKDOWN,
  TODAY_DAY_OF_MONTH,
  TOTAL_REVENUE_ATTRIBUTED,
  type AnalyticsRange,
  bookingsForRange,
  formatCurrency,
  revenueBreakdownToCsv,
} from "@/lib/partner";
import { downloadTextFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/**
 * Story 7.3 — Partner Analytics. DESIGN-SYSTEM.md §5 patrón 19 (vista de
 * analítica, sobre el patrón 15). Artboard: Analytics.dc.html.
 */
export default function AnalyticsPage() {
  const [range, setRange] = React.useState<AnalyticsRange>("month");
  const bars = bookingsForRange(range);
  const maxWeekday = Math.max(...ARRIVALS_BY_WEEKDAY.map((d) => d.guests));

  return (
    <PartnerShell
      topbarLabel="Analytics"
      topbarMeta="· The Ainsworth · September 1 – 14, month to date"
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
        September 1 – 14 · compared with August
      </p>
      <h1 className="mt-2 text-[34px] text-fg">How the month is going</h1>

      <div className="mt-5 grid grid-cols-4 gap-3.5">
        <MetricTile
          label="Bookings"
          value={String(MONTHLY_BOOKINGS_TOTAL)}
          note={`${ANALYTICS_SUMMARY.bookingsLastMonthSameDays} in the same days of August`}
        />
        <MetricTile
          label="Guests who arrived"
          value={String(GUESTS_WHO_ARRIVED)}
          note="91.4% of bookings kept"
        />
        <MetricTile
          label="No-shows"
          value={String(ANALYTICS_SUMMARY.noShows)}
          note={`4.8% · plus ${ANALYTICS_SUMMARY.cancellations} cancellations`}
        />
        <MetricTile
          label="Attributed to LuxePass"
          value={formatCurrency(TOTAL_REVENUE_ATTRIBUTED)}
          note="Paid out on October 5"
        />
      </div>

      <div className="mt-4 flex gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-content border border-line bg-dark-card p-5">
            <p className="m-0 text-sm font-bold text-fg">Bookings a day</p>
            <p className="m-0 mt-1 text-xs text-fg-subtle">
              September 1 – 14 · {(MONTHLY_BOOKINGS_TOTAL / 14).toFixed(1)} a day on average
            </p>
            <div className="mt-5 flex h-[140px] items-end gap-2">
              {bars.map((value, index) => {
                const dayNumber = range === "month" ? index + 1 : TODAY_DAY_OF_MONTH - 6 + index;
                const isToday = dayNumber === TODAY_DAY_OF_MONTH;
                return (
                  <div key={dayNumber} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className={cn("text-[11px] font-bold", isToday ? "text-accent" : "text-fg-subtle")}>
                      {value}
                    </span>
                    <div
                      data-testid="daily-bar"
                      style={{ height: `${value * 5}px` }}
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
              Arrivals by day of the week · Friday and Saturday are 41% of the month
            </p>
            <div className="mt-4 flex flex-col">
              {ARRIVALS_BY_WEEKDAY.map((day) => (
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
          <p className="m-0 mt-1 text-xs text-fg-subtle">{GUESTS_WHO_ARRIVED} guests who actually arrived</p>

          <RevenueRow
            label="Day passes"
            note={`${ANALYTICS_SUMMARY.dayPassVisits} visits · $75.00 each`}
            amount={formatCurrency(REVENUE_BREAKDOWN.dayPasses)}
          />
          <RevenueRow
            label="Membership visits"
            note={`${ANALYTICS_SUMMARY.membershipVisits} visits · $38.00 partner rate`}
            amount={formatCurrency(REVENUE_BREAKDOWN.membershipVisits)}
          />
          <RevenueRow
            label="Shared no-show fees"
            note={`${ANALYTICS_SUMMARY.noShows} no-shows · half of $35.00`}
            amount={formatCurrency(REVENUE_BREAKDOWN.noShowFees)}
            last
          />

          <div className="mt-4 flex items-center justify-between rounded-[14px] border border-gold-600 bg-panel-black p-4">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
                Attributed to LuxePass
              </p>
              <h3 className="mt-1.5 font-display text-[27px] text-fg">
                {formatCurrency(TOTAL_REVENUE_ATTRIBUTED)}
              </h3>
            </div>
            <p className="m-0 text-right text-[11.5px] leading-[1.4] text-fg-subtle">
              {formatCurrency(ANALYTICS_SUMMARY.revenueVsAugust)}
              <br />
              more than August
            </p>
          </div>

          <p className="m-0 mt-4 text-[11.5px] leading-[1.6] text-fg-subtle">
            The partner rate for a membership visit and the split on no-show fees are the ones in
            your agreement with En Soleil. Statements are issued on the 5th for the month before.
          </p>

          <button
            type="button"
            onClick={() => downloadTextFile("ainsworth-revenue.csv", revenueBreakdownToCsv())}
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
