"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { ADMIN_CASE_COUNTS } from "@/lib/admin";
import { AMENITY_DEMAND, CITY_DEMAND, LOUNGE_POPULARITY, OTHER_CITIES_FOLD } from "@/lib/admin-analytics";

/**
 * Story 8.2 — "Most popular lounges and amenities report" y "Geographic
 * usage patterns". Artboard: docs/design/epic-8-admin-support/Popularity.dc.html.
 */
export default function DemandPage() {
  const router = useRouter();
  const maxBookings = LOUNGE_POPULARITY[0]?.bookings ?? 1;

  return (
    <AdminShell
      topbarLabel={
        <>
          <Link
            href="/admin/analytics"
            className="text-[13.5px] font-bold text-fg-subtle transition-colors duration-150 hover:text-accent"
          >
            Analytics
          </Link>
          <span className="text-[13.5px] text-fg-subtle">›</span>
          <span className="text-[13.5px] font-bold text-fg">Demand</span>
        </>
      }
      supportBadge={ADMIN_CASE_COUNTS.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            September 1 – 14 · 1,208 bookings
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Where the demand is</h1>
        </div>
        <div className="flex items-center gap-2.5">
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

      <div className="mt-4.5 flex min-h-0 gap-4">
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-content border border-line bg-dark-card">
            <div
              className="grid grid-cols-[1fr_246px_74px_66px] items-center gap-3.5 border-b border-line px-5.5"
              style={{ height: 42 }}
            >
              <Th>Lounge</Th>
              <Th>Bookings</Th>
              <Th className="text-right">Count</Th>
              <Th className="text-right">Share</Th>
            </div>

            {LOUNGE_POPULARITY.map((lounge) => (
              <div
                key={lounge.name}
                className="grid grid-cols-[1fr_246px_74px_66px] items-center gap-3.5 border-b border-[rgba(58,50,42,0.6)] px-5.5 last:border-b-0"
                style={{ height: 54 }}
              >
                <div className="min-w-0">
                  <p className="m-0 text-[13.5px] font-bold text-fg">{lounge.name}</p>
                  <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
                    {lounge.area} · {lounge.noShows} no-shows
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-pill bg-panel-black">
                  <div
                    className="h-2.5 rounded-pill bg-accent"
                    style={{ width: `${(lounge.bookings / maxBookings) * 100}%` }}
                  />
                </div>
                <p className="m-0 text-right text-[13.5px] font-bold text-fg">{lounge.bookings}</p>
                <p className="m-0 text-right text-[12.5px] text-fg-muted">{lounge.sharePct}%</p>
              </div>
            ))}

            <div className="flex items-center gap-2.5 px-5.5" style={{ height: 34 }}>
              <ChevronDown size={15} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
              <span className="text-xs font-semibold text-fg-subtle">
                {OTHER_CITIES_FOLD.label} · {OTHER_CITIES_FOLD.bookings} bookings · {OTHER_CITIES_FOLD.sharePct}%
              </span>
            </div>
          </div>

          <p className="mt-3.5 text-xs text-fg-subtle">
            Every share on this screen is counted against the 1,208 bookings of the period, so the eight rows and the
            folded line add up to 100%. Geography is grouped by lounge, never by a member&apos;s own location history.
          </p>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Amenities members filter for
            </p>
            <p className="m-0 mt-2 text-[11.5px] text-fg-subtle">
              Share of searches that include the filter — a search can carry several.
            </p>

            <div className="mt-3.5 flex flex-col gap-2.5">
              {AMENITY_DEMAND.map((amenity) => (
                <div key={amenity.label}>
                  <div className="flex items-center gap-2.5">
                    <p className="m-0 flex-1 text-[12.5px] font-bold text-fg">{amenity.label}</p>
                    <p className="m-0 text-xs font-bold text-fg-muted">{amenity.pct}%</p>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-pill bg-panel-black">
                    <div className="h-2.5 rounded-pill bg-accent" style={{ width: `${amenity.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3.5 text-[11.5px] text-fg-subtle">
              Showers lead every month and only four lounges have them — the clearest case for the next partner
              conversation.
            </p>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Cities</p>
            {CITY_DEMAND.map((city) => (
              <div key={city.city} className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3.5 first:mt-2.5">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-bold text-fg">{city.city}</p>
                  <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">
                    {city.lounges} lounges · {city.bookings} bookings{city.note ? ` · ${city.note}` : ""}
                  </p>
                </div>
                <p className="m-0 text-[13px] font-bold text-fg">{city.sharePct}%</p>
              </div>
            ))}
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
