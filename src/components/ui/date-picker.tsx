import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { MonthDay } from "@/lib/booking";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Date picker mensual (Fase 5).
 * Celda de 38px, radius 10px, 13px/600. Cinco estados: disponible, seleccionado,
 * hoy, completo, cerrado, pasado (`Main.dc.html`).
 */
const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function weekdayOf(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

export interface MonthCalendarProps {
  monthLabel: string;
  days: MonthDay[];
  selectedDate?: string;
  onSelectDate: (dateIso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
}

export function MonthCalendar({
  monthLabel,
  days,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
}: MonthCalendarProps) {
  const leadingBlanks = days.length > 0 ? weekdayOf(days[0]!.dateIso) : 0;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrev}
          onClick={onPrevMonth}
          className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-blush-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={15} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
        </button>
        <h3 className="text-lg text-fg">{monthLabel}</h3>
        <button
          type="button"
          aria-label="Next month"
          onClick={onNextMonth}
          className="flex size-8 items-center justify-center rounded-[9px] border border-line bg-surface"
        >
          <ChevronRight size={15} strokeWidth={1.9} className="text-fg-muted" aria-hidden />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-center text-[11px] font-bold tracking-[0.08em] text-fg-subtle"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden />
        ))}
        {days.map((day) => (
          <DayCell
            key={day.dateIso}
            day={day}
            selected={selectedDate === day.dateIso}
            onSelect={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  selected,
  onSelect,
}: {
  day: MonthDay;
  selected: boolean;
  onSelect: (dateIso: string) => void;
}) {
  const base =
    "flex h-[38px] items-center justify-center rounded-[10px] text-[13px] font-semibold";

  if (day.status === "past") {
    return (
      <span className={cn(base, "cursor-default bg-blush-1 text-fg-subtle")}>
        {day.day}
      </span>
    );
  }

  if (day.status === "full" || day.status === "closed") {
    return (
      <span
        className={cn(
          base,
          "cursor-default text-fg-subtle",
          day.status === "full" && "border border-line bg-surface",
          day.status === "closed" &&
            "border border-dashed border-line bg-blush-1",
        )}
      >
        {day.day}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={String(day.day)}
      onClick={() => onSelect(day.dateIso)}
      className={cn(
        base,
        "cursor-pointer transition-colors duration-150 hover:border-accent",
        selected && "border border-accent bg-accent text-on-accent",
        !selected && day.status === "today" && "border-[1.5px] border-accent bg-surface text-fg",
        !selected && day.status === "open" && "border border-transparent bg-accent-soft text-fg",
      )}
    >
      {day.day}
    </button>
  );
}
