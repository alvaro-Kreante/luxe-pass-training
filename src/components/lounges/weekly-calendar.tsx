import { Fragment } from "react";

import { today, addDays } from "@/lib/availability";
import {
  WEEK_BANDS,
  type AvailabilityCell,
  type WeekBandId,
} from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md "Calendario de disponibilidad" (Fase 4) —
 * `Availability.dc.html` / `Closure.dc.html`. Grid de `84px repeat(7, 1fr)`
 * con las cuatro franjas del día y los cinco estados de celda.
 */
export interface SelectedCell {
  dateIso: string;
  band: WeekBandId;
}

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

function dayNumber(dateIso: string): number {
  return Number(dateIso.slice(-2));
}

export function WeeklyCalendar({
  weekStart,
  cells,
  selected,
  onSelect,
}: {
  weekStart: string;
  cells: AvailabilityCell[];
  selected: SelectedCell | null;
  onSelect: (cell: { dateIso: string; band: WeekBandId; seatsLeft: number }) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const cellAt = (dateIso: string, band: WeekBandId): AvailabilityCell =>
    cells.find((cell) => cell.dateIso === dateIso && cell.band === band)!;

  return (
    <div>
      <div
        className="mb-2 grid gap-2"
        style={{ gridTemplateColumns: "84px repeat(7, minmax(0, 1fr))" }}
      >
        <div />
        {days.map((dateIso) => {
          const isToday = dateIso === today();
          return (
            <div
              key={dateIso}
              className={cn(
                "rounded-nav py-1 text-center",
                isToday && "bg-accent-soft",
              )}
            >
              <p
                className={cn(
                  "m-0 text-[11.5px] font-bold uppercase tracking-[0.06em]",
                  isToday ? "text-gold-600" : "text-fg-subtle",
                )}
              >
                {DAY_LABEL_FORMAT.format(new Date(`${dateIso}T00:00:00Z`))}
              </p>
              <p
                className={cn(
                  "m-0 mt-0.5 text-sm",
                  isToday ? "font-bold text-fg" : "font-semibold text-fg-muted",
                )}
              >
                {dayNumber(dateIso)}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "84px repeat(7, minmax(0, 1fr))" }}
      >
        {WEEK_BANDS.map((band) => (
          <Fragment key={band.id}>
            <div className="flex flex-col justify-center">
              <p className="m-0 text-[12.5px] font-bold text-fg">{band.label}</p>
              <p className="m-0 mt-0.5 text-[11px] text-fg-subtle">{band.hours}</p>
            </div>

            {days.map((dateIso) => {
              const cell = cellAt(dateIso, band.id);
              const isSelected =
                selected?.dateIso === dateIso && selected.band === band.id;

              return (
                <Cell
                  key={`${dateIso}-${band.id}`}
                  dateIso={dateIso}
                  band={band}
                  cell={cell}
                  selected={isSelected}
                  onSelect={onSelect}
                />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="mt-4.5 flex flex-wrap items-center gap-5 border-t border-line pt-4">
        <Legend swatchClassName="bg-accent-soft">Available</Legend>
        <Legend swatchClassName="border-[1.5px] border-accent bg-surface">
          Selected
        </Legend>
        <Legend swatchClassName="border border-line bg-surface">Fully booked</Legend>
        <Legend swatchClassName="border border-dashed border-line bg-blush-1">
          Closed
        </Legend>
        <div className="flex-1" />
        <span className="text-xs text-fg-subtle">
          Capacity shown for admission of one member
        </span>
      </div>
    </div>
  );
}

function Cell({
  dateIso,
  band,
  cell,
  selected,
  onSelect,
}: {
  dateIso: string;
  band: (typeof WEEK_BANDS)[number];
  cell: AvailabilityCell;
  selected: boolean;
  onSelect: (cell: { dateIso: string; band: WeekBandId; seatsLeft: number }) => void;
}) {
  const dayLabel = DAY_LABEL_FORMAT.format(new Date(`${dateIso}T00:00:00Z`));
  const base =
    "flex h-[104px] flex-col items-center justify-center gap-0.5 rounded-xl";

  if (cell.status === "available") {
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${dayLabel} ${dateIso.slice(-2)}, ${band.label}: ${cell.seatsLeft} seats left`}
        onClick={() =>
          onSelect({ dateIso, band: band.id, seatsLeft: cell.seatsLeft! })
        }
        className={cn(
          base,
          selected
            ? "border-[1.5px] border-accent bg-surface"
            : "bg-accent-soft",
        )}
      >
        <span className="text-[15px] font-bold text-fg">{cell.seatsLeft}</span>
        <span
          className={cn(
            "text-[11px]",
            selected ? "font-bold text-gold-600" : "text-fg-muted",
          )}
        >
          {selected ? "Selected" : "seats left"}
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        base,
        cell.status === "full" && "border border-line bg-surface",
        cell.status === "closed" &&
          "border border-dashed border-line bg-blush-1",
        cell.status === "past" && "bg-blush-1",
      )}
    >
      <span className="text-[12.5px] font-bold text-fg-subtle">
        {cell.status === "full" && "Fully booked"}
        {cell.status === "closed" && "Closed"}
        {cell.status === "past" && "Passed"}
      </span>
      {cell.closureReason ? (
        <span className="text-[11px] text-fg-subtle">{cell.closureReason}</span>
      ) : null}
    </div>
  );
}

function Legend({
  swatchClassName,
  children,
}: {
  swatchClassName: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2 text-xs text-fg-muted">
      <span aria-hidden className={cn("size-4 rounded-[5px]", swatchClassName)} />
      {children}
    </span>
  );
}
