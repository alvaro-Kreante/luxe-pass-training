import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BookingRestrictions } from "@/components/lounges/booking-restrictions";
import { FreshnessNote } from "@/components/lounges/freshness-note";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { StatusChip } from "@/components/ui/status-chip";
import { today } from "@/lib/availability";
import {
  WEEK_BANDS,
  formatWeekdayDate,
  type HoursRow,
  type WeekBandId,
} from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/**
 * Story 3.2 — "Real-time availability status: Available / Not Available"
 * (Main.dc.html / NotAvailable.dc.html). El catálogo solo modela franjas, no
 * horas exactas, así que "Next available times" ofrece las franjas del día
 * en vez de las horas concretas del artboard. Todos los datos (plazas de
 * hoy, hueco siguiente, marca de frescura) llegan ya resueltos de la página
 * — vienen de `fetchWeeklyAvailability`/`fetchNextAvailableSlot` (Supabase).
 */
function weekBandLabel(id: WeekBandId): string {
  return WEEK_BANDS.find((band) => band.id === id)!.label;
}

export interface AvailabilityCardProps {
  loungeId: string;
  capacity: number;
  bookingRestrictions: string[];
  hoursToday: HoursRow;
  available: boolean;
  todaySeatsLeft: number;
  nextAvailable?: { dateIso: string; band: WeekBandId; seatsLeft: number };
  lastUpdatedAt: string;
}

export function AvailabilityCard(props: AvailabilityCardProps) {
  const { available } = props;

  return (
    <Card
      variant="content"
      className="h-fit w-[344px] shrink-0 border border-line p-5.5"
    >
      <div className="flex items-center justify-between">
        <Eyebrow>Today · {formatWeekdayDate(today())}</Eyebrow>
        <StatusChip available={available}>
          {available ? "Available" : "Not available"}
        </StatusChip>
      </div>

      {available ? <AvailableBody {...props} /> : <NotAvailableBody {...props} />}
    </Card>
  );
}

function AvailableBody({
  loungeId,
  capacity,
  bookingRestrictions,
  hoursToday,
  todaySeatsLeft,
  lastUpdatedAt,
}: AvailabilityCardProps) {
  const upcoming = WEEK_BANDS.slice(0, 3);
  const closingTime = hoursToday.hours.split("–")[1]!.trim();

  return (
    <>
      <h2 className="mb-1 mt-3 text-[22px] text-fg">Open until {closingTime}</h2>
      <p className="m-0 text-[12.5px] text-fg-subtle">
        {todaySeatsLeft} of {capacity} seats free right now
      </p>

      <div className="my-4.5 h-px bg-line" />

      <p className="m-0 mb-2.5 text-[12.5px] font-bold text-fg">
        Next available times
      </p>
      <div className="flex gap-2">
        {upcoming.map((band) => (
          <span
            key={band.id}
            className="flex h-[42px] flex-1 items-center justify-center rounded-[11px] border-[1.5px] border-line text-[12.5px] font-semibold text-fg-muted"
          >
            {band.label}
          </span>
        ))}
      </div>

      <Link
        href={`/lounges/${loungeId}/book`}
        className={cn(buttonVariants({ size: "lg", block: true }), "mt-3.5")}
      >
        Book now
      </Link>

      <Link
        href={`/lounges/${loungeId}/availability`}
        className="mt-3 flex items-center justify-center gap-2 text-[12.5px] font-bold"
      >
        View weekly availability
      </Link>

      <div className="my-4.5 h-px bg-line" />

      <p className="m-0 mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        Booking restrictions
      </p>
      <BookingRestrictions restrictions={bookingRestrictions} />

      <FreshnessNote
        lastUpdatedAt={lastUpdatedAt}
        className="mt-4 border-t border-line pt-3.5"
      />
    </>
  );
}

function NotAvailableBody({
  loungeId,
  nextAvailable,
  lastUpdatedAt,
}: AvailabilityCardProps) {
  return (
    <>
      <h2 className="mb-1 mt-3 text-[22px] text-fg">Fully booked today</h2>
      <p className="m-0 text-[12.5px] leading-[1.5] text-fg-subtle">
        All time bands are at capacity for the rest of today.
      </p>

      <div className="my-4.5 h-px bg-line" />

      {nextAvailable ? (
        <>
          <p className="m-0 mb-2.5 text-[12.5px] font-bold text-fg">
            Next available
          </p>
          <Link
            href={`/lounges/${loungeId}/availability`}
            className="flex items-center gap-3 rounded-xl border-[1.5px] border-accent bg-accent-soft p-3.5"
          >
            <span className="flex-1">
              <span className="block text-[13.5px] font-bold text-fg">
                {formatWeekdayDate(nextAvailable.dateIso)} ·{" "}
                {weekBandLabel(nextAvailable.band)}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-fg-muted">
                {nextAvailable.seatsLeft} seats free
              </span>
            </span>
            <ChevronRight size={17} strokeWidth={1.9} className="text-accent-strong" />
          </Link>
        </>
      ) : null}

      <Link
        href={`/lounges/${loungeId}/availability`}
        className={cn(buttonVariants({ size: "lg", block: true }), "mt-3.5")}
      >
        Pick another day
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

      <FreshnessNote
        lastUpdatedAt={lastUpdatedAt}
        className="mt-4 border-t border-line pt-3.5"
      />
    </>
  );
}
