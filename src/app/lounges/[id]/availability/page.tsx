"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { RequireSession } from "@/components/onboarding/require-session";
import { BookingRestrictions } from "@/components/lounges/booking-restrictions";
import { ClosureBanner } from "@/components/lounges/closure-banner";
import { LoungeSubviewHeader } from "@/components/lounges/lounge-subview-header";
import {
  WeeklyCalendar,
  type SelectedCell,
} from "@/components/lounges/weekly-calendar";
import { AppShell } from "@/components/patterns/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { StatusChip } from "@/components/ui/status-chip";
import { today, addDays, parseDate } from "@/lib/availability";
import {
  fetchClosuresForWeek,
  fetchLoungeProfile,
  fetchNextAvailableSlot,
  fetchWeeklyAvailability,
  formatWeekdayDate,
  mondayOf,
  WEEK_BANDS,
  type AvailabilityCell,
  type Closure,
  type LoungeProfile,
} from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Story 3.2 — Availability. Sub-vista de lounge (DESIGN-SYSTEM.md §5 patrón
 * 8). Artboards: `Availability.dc.html` (con plazas) y `Closure.dc.html`
 * (cierre por festivo) — ambos son la misma pantalla en distinta semana.
 * Backend real: `fetchWeeklyAvailability`/`fetchClosuresForWeek` (Supabase),
 * con refresco cada 5 min (ver `docs/design/COMPONENT-MAP.md` "Backend real
 * — Epic 3").
 */
const REFRESH_INTERVAL_MS = 5 * 60_000;

function firstAvailable(cells: AvailabilityCell[]): SelectedCell | null {
  const cell = cells.find((c) => c.status === "available");
  return cell ? { dateIso: cell.dateIso, band: cell.band } : null;
}

function weekRangeLabel(weekStart: string): string {
  const start = parseDate(weekStart);
  const end = parseDate(addDays(weekStart, 6));
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const startLabel = `${month.format(start)} ${start.getUTCDate()}`;
  const endLabel =
    start.getUTCMonth() === end.getUTCMonth()
      ? `${end.getUTCDate()}`
      : `${month.format(end)} ${end.getUTCDate()}`;

  return `${startLabel} – ${endLabel}, ${end.getUTCFullYear()}`;
}

function bandLabelOf(id: string): string {
  return WEEK_BANDS.find((band) => band.id === id)!.label;
}

export default function AvailabilityPage() {
  return (
    <RequireSession>
      <AvailabilityScreen />
    </RequireSession>
  );
}

function AvailabilityScreen() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [lounge, setLounge] = React.useState<LoungeProfile | null | undefined>(
    undefined,
  );
  const loungeRef = React.useRef<LoungeProfile | null>(null);

  const [weekStart, setWeekStart] = React.useState(() =>
    mondayOf(searchParams.get("week") ?? today()),
  );
  /** `weekStart` de arriba es la semana *pedida*; esta es la última semana
   * *cargada* — la vista se pinta siempre desde esta, para no mostrar nunca
   * un encabezado ya en la semana nueva junto a celdas todavía de la vieja. */
  const [weekData, setWeekData] = React.useState<{
    weekStart: string;
    cells: AvailabilityCell[];
    closures: Closure[];
    lastUpdatedAt: string;
    next?: { dateIso: string; band: (typeof WEEK_BANDS)[number]["id"]; seatsLeft: number };
  } | null>(null);

  const [selected, setSelected] = React.useState<SelectedCell | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    fetchLoungeProfile(supabase, id).then((profile) => {
      if (!active) return;
      setLounge(profile);
      loungeRef.current = profile;
    });

    return () => {
      active = false;
    };
  }, [id]);

  const loadWeek = React.useCallback(
    async (loungeProfile: LoungeProfile, week: string, resetSelection: boolean) => {
      const supabase = createClient();
      const [weekCells, weekClosures] = await Promise.all([
        fetchWeeklyAvailability(supabase, loungeProfile, week),
        fetchClosuresForWeek(supabase, loungeProfile.id, week),
      ]);

      const next = firstAvailable(weekCells)
        ? undefined
        : await fetchNextAvailableSlot(supabase, loungeProfile);

      setWeekData({
        weekStart: week,
        cells: weekCells,
        closures: weekClosures,
        lastUpdatedAt: new Date().toISOString(),
        next,
      });
      setSelected((current) =>
        resetSelection || !current ? firstAvailable(weekCells) : current,
      );
    },
    [],
  );

  React.useEffect(() => {
    if (!lounge) return;
    /** Navegar de semana pide un hueco por defecto nuevo; el refresco
     * periódico (otro efecto) conserva la selección del miembro.
     * `Promise.resolve().then(...)` (no llamar `loadWeek` directo) porque
     * sus `setState` solo corren tras el `await` interno, nunca síncronos
     * dentro de este efecto. */
    Promise.resolve().then(() => loadWeek(lounge, weekStart, true));
  }, [lounge, weekStart, loadWeek]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (loungeRef.current) loadWeek(loungeRef.current, weekStart, false);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [weekStart, loadWeek]);

  if (lounge === null) {
    notFound();
    return null;
  }

  if (!lounge || !weekData) {
    return <AppShell padded={false}>{null}</AppShell>;
  }

  const { cells, closures, lastUpdatedAt, next } = weekData;
  const selectedCell = selected
    ? cells.find((cell) => cell.dateIso === selected.dateIso && cell.band === selected.band)
    : undefined;
  const closure = closures[0];

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <LoungeSubviewHeader
          lounge={lounge}
          backHref={`/lounges/${lounge.id}`}
          backLabel="Back to profile"
          address={`${lounge.neighborhood} · ${lounge.city} · ${lounge.address}`}
          lastUpdatedAt={lastUpdatedAt}
        />

        <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            {closure ? <ClosureBanner closure={closure} /> : null}

            <Card variant="content" className="border border-line p-5.5">
              <div className="mb-4.5 flex items-center justify-between">
                <div>
                  <Eyebrow>Weekly availability</Eyebrow>
                  <h2 className="mt-1.5 text-[22px] text-fg">
                    {weekRangeLabel(weekData.weekStart)}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous week"
                    onClick={() => setWeekStart((w) => addDays(w, -7))}
                    className="flex size-10 items-center justify-center rounded-[11px] border-[1.5px] border-line"
                  >
                    <ChevronLeft size={17} strokeWidth={1.9} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekStart(mondayOf(today()))}
                    className="flex h-10 items-center rounded-[11px] border-[1.5px] border-line px-4 text-[12.5px] font-bold text-fg-muted"
                  >
                    This week
                  </button>
                  <button
                    type="button"
                    aria-label="Next week"
                    onClick={() => setWeekStart((w) => addDays(w, 7))}
                    className="flex size-10 items-center justify-center rounded-[11px] border-[1.5px] border-line"
                  >
                    <ChevronRight size={17} strokeWidth={1.9} aria-hidden />
                  </button>
                </div>
              </div>

              <WeeklyCalendar
                weekStart={weekData.weekStart}
                cells={cells}
                selected={selected}
                onSelect={(cell) => setSelected({ dateIso: cell.dateIso, band: cell.band })}
              />
            </Card>
          </div>

          <div className="flex w-[344px] shrink-0 flex-col gap-4">
            {selectedCell && selected ? (
              <Card variant="content" className="border border-line p-5.5">
                <div className="flex items-center justify-between">
                  <Eyebrow>Your selection</Eyebrow>
                  <StatusChip available>Available</StatusChip>
                </div>
                <h2 className="mb-1 mt-3 text-[22px] text-fg">
                  {formatWeekdayDate(selected.dateIso)}
                </h2>
                <p className="m-0 text-[13px] text-fg-muted">
                  {bandLabelOf(selected.band)}
                </p>
                <p className="m-0 mt-1.5 text-[12.5px] text-fg-subtle">
                  {selectedCell.seatsLeft} seats free in this band
                </p>
                <Link
                  href={`/lounges/${lounge.id}/book`}
                  className={cn(buttonVariants({ size: "lg", block: true }), "mt-4.5")}
                >
                  Book now
                </Link>
                <Link
                  href="/explore"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg", block: true }),
                    "mt-2.5",
                  )}
                >
                  Back to search
                </Link>
              </Card>
            ) : next ? (
              <Card variant="content" className="border border-line p-5.5">
                <div className="flex items-center justify-between">
                  <Eyebrow>Next open day</Eyebrow>
                  <StatusChip available>Available</StatusChip>
                </div>
                <h2 className="mb-1 mt-3 text-[22px] text-fg">
                  {formatWeekdayDate(next.dateIso)}
                </h2>
                <p className="m-0 text-[13px] text-fg-muted">
                  {bandLabelOf(next.band)} · {next.seatsLeft} seats free
                </p>
                <Link
                  href={`/lounges/${lounge.id}/book`}
                  className={cn(buttonVariants({ size: "lg", block: true }), "mt-4.5")}
                >
                  Book {formatWeekdayDate(next.dateIso)}
                </Link>
              </Card>
            ) : null}

            <Card variant="content" className="border border-line p-5.5">
              <Eyebrow className="mb-3">Booking restrictions</Eyebrow>
              <BookingRestrictions restrictions={lounge.bookingRestrictions} />
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
