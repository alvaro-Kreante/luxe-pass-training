"use client";

import * as React from "react";
import { UserRound } from "lucide-react";

import { useBooking } from "./booking-context";
import { MonthCalendar } from "@/components/ui/date-picker";
import { TimeSlotGrid } from "@/components/ui/time-slot";
import { TODAY } from "@/lib/availability";
import {
  ADMISSION_COUNT,
  SPECIAL_REQUEST_MAX_LENGTH,
  addMonths,
  monthCalendar,
  slotsFor,
  startOfMonth,
  type BookingSlot,
} from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

/**
 * Story 4.1 — Paso 1 "Visit details" (`Main.dc.html`). Date picker mensual
 * que arranca en hoy, slots de llegada, admisión fija para un miembro y
 * peticiones especiales con contador de 100 caracteres.
 */
export function VisitDetailsForm() {
  const { lounge, draft, update } = useBooking();
  const [monthIso, setMonthIso] = React.useState(() => startOfMonth(TODAY));

  const days = React.useMemo(() => monthCalendar(lounge, monthIso), [lounge, monthIso]);
  const slots = React.useMemo(
    () => (draft.dateIso ? slotsFor(lounge, draft.dateIso) : []),
    [lounge, draft.dateIso],
  );

  function selectDate(dateIso: string) {
    update({ dateIso, time: null, band: null, seatsLeft: null });
  }

  function selectSlot(slot: BookingSlot) {
    update({ time: slot.time, band: slot.band, seatsLeft: slot.seatsLeft });
  }

  return (
    <>
      <div className="mb-3 mt-[22px] flex items-center justify-between">
        <p className="m-0 text-[15px] font-bold text-fg">Select a date</p>
        <span className="text-xs text-fg-subtle">Today through 60 days ahead</span>
      </div>

      <MonthCalendar
        monthLabel={MONTH_LABEL_FORMAT.format(new Date(`${monthIso}T00:00:00Z`))}
        days={days}
        selectedDate={draft.dateIso ?? undefined}
        onSelectDate={selectDate}
        onPrevMonth={() => setMonthIso((m) => addMonths(m, -1))}
        onNextMonth={() => setMonthIso((m) => addMonths(m, 1))}
        canGoPrev={monthIso !== startOfMonth(TODAY)}
      />

      {draft.dateIso ? (
        <>
          <p className="m-0 mb-2.5 mt-5 text-[15px] font-bold text-fg">
            Arrival time · {formatWeekdayDate(draft.dateIso)}
          </p>
          <TimeSlotGrid
            slots={slots}
            selectedTime={draft.time ?? undefined}
            onSelect={selectSlot}
          />
        </>
      ) : null}

      <div className="mt-4.5 flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
          <UserRound size={17} strokeWidth={1.7} className="text-accent-strong" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="m-0 text-[13.5px] font-bold text-fg">Admission for one</p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">
            Your pass admits the member only. Guests cannot be added to a booking.
          </p>
        </div>
        <span className="rounded-pill bg-accent-soft px-3.5 py-1.5 text-[12.5px] font-bold text-fg">
          {ADMISSION_COUNT} member
        </span>
      </div>

      <SpecialRequestsField
        value={draft.specialRequests}
        onChange={(value) => update({ specialRequests: value })}
      />
    </>
  );
}

function SpecialRequestsField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-4.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-[15px] font-bold text-fg">
          Special requests <span className="font-normal text-fg-subtle">· optional</span>
        </p>
        <span className="text-xs font-semibold text-fg-subtle">
          {value.length} / {SPECIAL_REQUEST_MAX_LENGTH}
        </span>
      </div>
      <textarea
        aria-label="Special requests"
        value={value}
        maxLength={SPECIAL_REQUEST_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Quiet desk near a window if possible, and a still water on arrival."
        className="h-[84px] w-full resize-none rounded-xl border border-line bg-surface p-3.5 text-[13.5px] text-fg placeholder:text-fg-subtle focus:border-accent focus:shadow-ring focus:outline-none"
      />
    </div>
  );
}
