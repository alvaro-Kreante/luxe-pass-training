"use client";

import { addDays, TODAY, isPast, parseDate } from "@/lib/availability";
import { cn } from "@/lib/utils";

/**
 * Calendario del drawer de filtros (Filters.dc.html): tres semanas de la del
 * "hoy" del mockup en adelante, con el día elegido en `--gold-500`, los que
 * tienen disponibilidad en `--gold-100` y los demás atenuados.
 *
 * No es el calendario semanal de la Fase 4 (§5 "Calendario de disponibilidad"),
 * que muestra franjas por día para un solo lounge.
 */

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKS = 3;

/** El lunes de la semana en que cae `TODAY`. */
function firstMonday(): string {
  const weekday = parseDate(TODAY).getUTCDay();
  const backToMonday = weekday === 0 ? 6 : weekday - 1;

  return addDays(TODAY, -backToMonday);
}

export function AvailabilityCalendar({
  selected,
  onSelect,
  /** Qué días tienen algún lounge disponible con el resto de filtros puestos. */
  hasAvailability,
}: {
  selected: string | null;
  onSelect: (date: string) => void;
  hasAvailability: (date: string) => boolean;
}) {
  const start = firstMonday();
  const days = Array.from({ length: WEEKS * 7 }, (_, index) =>
    addDays(start, index),
  );
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDate(TODAY));

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-[13px] font-semibold text-fg">Availability</p>
        <span className="text-xs text-fg-subtle">{monthLabel}</span>
      </div>

      <div className="mb-4 rounded-[16px] border border-line p-4 pb-[18px]">
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEKDAY_INITIALS.map((initial, index) => (
            <span
              key={index}
              aria-hidden
              className="text-center text-[10.5px] font-bold tracking-[0.06em] text-fg-subtle"
            >
              {initial}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date) => {
            const dayNumber = Number(date.slice(-2));
            const past = isPast(date);
            const available = !past && hasAvailability(date);
            const isSelected = date === selected;

            return (
              <button
                key={date}
                type="button"
                disabled={past || !available}
                aria-pressed={isSelected}
                onClick={() => onSelect(date)}
                className={cn(
                  "flex h-[38px] items-center justify-center rounded-nav text-[12.5px]",
                  "transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-ring",
                  isSelected && "bg-accent font-bold text-on-accent",
                  !isSelected &&
                    available &&
                    "cursor-pointer bg-accent-soft font-semibold text-fg hover:bg-accent hover:text-on-accent",
                  !available &&
                    "cursor-not-allowed text-fg-subtle opacity-45",
                )}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-3.5 border-t border-line pt-3.5">
          <Legend className="bg-accent-soft">Availability</Legend>
          <Legend className="bg-accent">Selected</Legend>
          <Legend className="border border-line" muted>
            Fully booked
          </Legend>
        </div>
      </div>
    </>
  );
}

function Legend({
  className,
  muted,
  children,
}: {
  className?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[11.5px]",
        muted ? "text-fg-subtle" : "text-fg-muted",
      )}
    >
      <span aria-hidden className={cn("size-2.5 rounded-[3px]", className)} />
      {children}
    </span>
  );
}
