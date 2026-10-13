"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";

import { MonthCalendar } from "@/components/ui/date-picker";
import { addMonths, daysInMonth, startOfMonth, type MonthDay } from "@/lib/booking";

/**
 * Story 8.4 — la fecha de `/admin/bookings` abre un calendario para saltar a
 * un día concreto. Reutiliza el `MonthCalendar` de la Fase 5 (§4 Date
 * picker); aquí todos los días se pueden elegir, también los pasados.
 */
function monthDays(monthIso: string, todayIso: string): MonthDay[] {
  const start = startOfMonth(monthIso);
  return Array.from({ length: daysInMonth(start) }, (_, index) => {
    const dateIso = `${start.slice(0, 8)}${String(index + 1).padStart(2, "0")}`;
    return { dateIso, day: index + 1, status: dateIso === todayIso ? "today" : "open" };
  });
}

export function DayPickerPopover({
  value,
  todayIso,
  label,
  onChange,
}: {
  value: string;
  todayIso: string;
  label: string;
  onChange: (dateIso: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(startOfMonth(value));

  function toggle(next: boolean) {
    if (next) setMonth(startOfMonth(value));
    setOpen(next);
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}T00:00:00Z`),
  );

  return (
    <Popover.Root open={open} onOpenChange={toggle}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Choose a date · ${label}`}
          className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] border-accent bg-panel-black px-4.5 shadow-ring transition-colors duration-150 hover:bg-surface-hover"
        >
          <CalendarDays size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
          <span className="text-[13.5px] font-bold text-fg">{label}</span>
          {value === todayIso ? (
            <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-accent">
              Today
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-theme="dark"
          align="end"
          sideOffset={8}
          className="z-50 w-[310px] rounded-[14px] border border-line bg-dark-card p-4 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <MonthCalendar
            monthLabel={monthLabel}
            days={monthDays(month, todayIso)}
            selectedDate={value}
            onSelectDate={(dateIso) => {
              onChange(dateIso);
              setOpen(false);
            }}
            onPrevMonth={() => setMonth((m) => addMonths(m, -1))}
            onNextMonth={() => setMonth((m) => addMonths(m, 1))}
            canGoPrev
          />
          {value !== todayIso ? (
            <button
              type="button"
              onClick={() => {
                onChange(todayIso);
                setOpen(false);
              }}
              className="mt-3 w-full cursor-pointer rounded-[10px] border border-line py-2 text-[12.5px] font-bold text-fg-muted transition-colors duration-150 hover:border-accent hover:text-fg"
            >
              Back to today
            </button>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
