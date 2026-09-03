"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
import { TODAY, addDays, parseDate } from "@/lib/availability";
import {
  closureCovering,
  contactFor,
  formatWeekdayDate,
  mondayOf,
  nextAvailableSlot,
  weeklyAvailability,
  WEEK_BANDS,
  type AvailabilityCell,
} from "@/lib/lounge-profile";
import { LOUNGES } from "@/lib/lounges";
import { cn } from "@/lib/utils";

/**
 * Story 3.2 — Availability. Sub-vista de lounge (DESIGN-SYSTEM.md §5 patrón
 * 8). Artboards: `Availability.dc.html` (con plazas) y `Closure.dc.html`
 * (cierre por festivo) — ambos son la misma pantalla en distinta semana.
 */
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
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const lounge = LOUNGES.find((candidate) => candidate.id === id);

  const [weekStart, setWeekStart] = React.useState(() =>
    mondayOf(searchParams.get("week") ?? TODAY),
  );

  const cells = React.useMemo(
    () => (lounge ? weeklyAvailability(lounge, weekStart) : []),
    [lounge, weekStart],
  );

  const [selected, setSelected] = React.useState<SelectedCell | null>(() =>
    firstAvailable(cells),
  );
  const [selectedWeekStart, setSelectedWeekStart] = React.useState(weekStart);

  /** Reelige el hueco por defecto al cambiar de semana — ajuste de estado
   * durante el render, no un efecto: no hay nada externo que sincronizar. */
  if (weekStart !== selectedWeekStart) {
    setSelectedWeekStart(weekStart);
    setSelected(firstAvailable(cells));
  }

  if (!lounge) {
    notFound();
    return null;
  }

  const contact = contactFor(lounge);
  const selectedCell = selected
    ? cells.find((cell) => cell.dateIso === selected.dateIso && cell.band === selected.band)
    : undefined;
  const closure = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .map((dateIso) => closureCovering(lounge, dateIso))
    .find((found) => found !== undefined);
  const next = !selectedCell ? nextAvailableSlot(lounge) : undefined;

  return (
    <AppShell padded={false}>
      <div className="flex h-full flex-col overflow-hidden">
        <LoungeSubviewHeader
          lounge={lounge}
          backHref={`/lounges/${lounge.id}`}
          backLabel="Back to profile"
          address={`${lounge.neighborhood} · ${lounge.city} · ${contact.address}`}
        />

        <div className="flex flex-1 gap-7 overflow-y-auto px-8 pb-7 pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            {closure ? <ClosureBanner closure={closure} /> : null}

            <Card variant="content" className="border border-line p-5.5">
              <div className="mb-4.5 flex items-center justify-between">
                <div>
                  <Eyebrow>Weekly availability</Eyebrow>
                  <h2 className="mt-1.5 text-[22px] text-fg">
                    {weekRangeLabel(weekStart)}
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
                    onClick={() => setWeekStart(mondayOf(TODAY))}
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
                lounge={lounge}
                weekStart={weekStart}
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
              <BookingRestrictions />
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
