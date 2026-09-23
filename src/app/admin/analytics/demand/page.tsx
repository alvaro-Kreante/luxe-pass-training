"use client";

import * as React from "react";
import { CalendarDays, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/patterns/admin-shell";
import { RequireAdminSession } from "@/components/admin/require-admin-session";
import { createClient } from "@/lib/supabase/client";
import { getTicketCounts, type TicketCounts } from "@/lib/admin";
import {
  type AmenityDemand,
  type CityDemand,
  type LoungePopularity,
  dateRangeForPeriod,
  formatDateRangeLabel,
  getAmenityDemand,
  getCityDemand,
  getLoungePopularity,
} from "@/lib/admin-analytics";

/**
 * Story 8.2 — "Most popular lounges and amenities report" y "Geographic
 * usage patterns". Artboard: docs/design/epic-8-admin-support/Popularity.dc.html.
 *
 * Backend real (22 sept 2026): `admin_lounge_popularity`/
 * `admin_amenity_demand`/`admin_city_demand`
 * (`supabase/schemas/admin_reports.sql`), sobre el rango de la quincena
 * (`dateRangeForPeriod("14d")`) relativo a `TODAY`.
 */
export default function DemandPage() {
  return (
    <RequireAdminSession>
      <DemandScreen />
    </RequireAdminSession>
  );
}

function DemandScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const range = React.useMemo(() => dateRangeForPeriod("14d"), []);
  const [lounges, setLounges] = React.useState<LoungePopularity[]>([]);
  const [amenities, setAmenities] = React.useState<AmenityDemand[]>([]);
  const [cities, setCities] = React.useState<CityDemand[]>([]);
  const [counts, setCounts] = React.useState<TicketCounts | null>(null);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      getLoungePopularity(supabase, range),
      getAmenityDemand(supabase, range),
      getCityDemand(supabase, range),
    ]).then(([loungeRows, amenityRows, cityRows]) => {
      if (!active) return;
      setLounges(loungeRows);
      setAmenities(amenityRows);
      setCities(cityRows);
    });
    getTicketCounts(supabase).then((row) => {
      if (active) setCounts(row);
    });
    return () => {
      active = false;
    };
  }, [supabase, range]);

  const maxBookings = lounges[0]?.bookings ?? 1;
  const totalBookings = lounges.reduce((sum, l) => sum + l.bookings, 0);

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
      supportBadge={counts?.open}
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
            {formatDateRangeLabel(range)} · {totalBookings.toLocaleString("en-US")} bookings
          </p>
          <h1 className="mt-2 font-display text-[34px] text-fg">Where the demand is</h1>
        </div>
        <div className="flex items-center gap-2.5">
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

            {lounges.map((lounge) => (
              <div
                key={lounge.loungeId}
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

            {lounges.length === 0 ? (
              <p className="px-5.5 py-6 text-[13px] text-fg-subtle">No bookings in this window yet.</p>
            ) : null}
          </div>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
              Amenities members filter for
            </p>

            <div className="mt-3.5 flex flex-col gap-2.5">
              {amenities.map((amenity) => (
                <div key={amenity.id}>
                  <div className="flex items-center gap-2.5">
                    <p className="m-0 flex-1 text-[12.5px] font-bold text-fg">{amenity.label}</p>
                    <p className="m-0 text-xs font-bold text-fg-muted">{amenity.sharePct}%</p>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-pill bg-panel-black">
                    <div className="h-2.5 rounded-pill bg-accent" style={{ width: `${amenity.sharePct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-content border border-line bg-dark-card px-5.5 py-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Cities</p>
            {cities.map((city) => (
              <div key={city.city} className="flex items-center gap-3 border-t border-[rgba(58,50,42,0.6)] py-3.5 first:mt-2.5">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-bold text-fg">{city.city}</p>
                  <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">
                    {city.lounges} lounges · {city.bookings} bookings
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
