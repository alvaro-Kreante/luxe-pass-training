"use client";

import * as React from "react";
import { CalendarPlus, Clock, MapPin, Notebook } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/availability";
import { STAY_HOURS, addMinutesToTime } from "@/lib/booking";
import {
  buildGoogleCalendarUrl,
  buildIcs,
  downloadIcsFile,
  type CalendarEventInput,
} from "@/lib/calendar-export";
import { formatWeekdayDate } from "@/lib/lounge-profile";
import type { Lounge } from "@/lib/lounges";
import { cn } from "@/lib/utils";

/**
 * Story 4.3 — "Add to Calendar option post-booking" (`Calendar.dc.html`).
 * A diferencia del resto del Epic 4, esta funcionalidad no se simula:
 * genera un `.ics` real y abre una URL real de Google Calendar.
 */
const REMINDER_MINUTES = 15;
type Target = "ios" | "google" | "outlook";

export function AddToCalendarModal({
  open,
  onOpenChange,
  lounge,
  address,
  dateIso,
  time,
  bookingReference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lounge: Lounge;
  address: string;
  dateIso: string;
  time: string;
  bookingReference: string;
}) {
  const [target, setTarget] = React.useState<Target>("ios");

  const eventInput: CalendarEventInput = {
    lounge,
    address,
    dateIso,
    time,
    bookingReference,
    reminderMinutes: REMINDER_MINUTES,
  };

  function addEvent() {
    if (target === "google") {
      window.open(buildGoogleCalendarUrl(eventInput), "_blank");
      return;
    }

    downloadIcsFile(`luxepass-${lounge.id}.ics`, buildIcs(eventInput));
  }

  const cancelDeadline = `${formatWeekdayDate(addDays(dateIso, -1))}, ${time}`;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add to your calendar"
      description="Pick where the event should go. Everything is filled in for you, including the address and your reference number."
      media={
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft">
          <CalendarPlus size={26} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <p className="m-0 flex-1 text-xs leading-[1.5] text-fg-subtle">
            If your booking changes, the event does not update automatically.
          </p>
          <Button variant="outline" size="md" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button size="md" onClick={addEvent}>
            Add event
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Calendar target">
        <TargetButton
          selected={target === "ios"}
          onSelect={() => setTarget("ios")}
          label="iOS Calendar"
          hint="Opens on your iPhone"
        />
        <TargetButton
          selected={target === "google"}
          onSelect={() => setTarget("google")}
          label="Google Calendar"
          hint="Opens in your browser"
        />
        <TargetButton
          selected={target === "outlook"}
          onSelect={() => setTarget("outlook")}
          label="Outlook · .ics"
          hint="Downloads a file"
        />
      </div>

      <p className="m-0 mb-2.5 mt-5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
        Event preview
      </p>

      <div className="rounded-2xl border border-line bg-blush-2 p-4.5">
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="w-1 self-stretch rounded-full bg-accent" />
          <div>
            <p className="m-0 text-[15px] font-bold text-fg">LuxePass · {lounge.name}</p>
            <p className="m-0 mt-1.5 text-[13px] text-fg-muted">
              {formatWeekdayDate(dateIso)} · {time} – {addMinutesToTime(time, STAY_HOURS * 60)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
          <div className="flex items-start gap-2.5">
            <MapPin size={16} strokeWidth={1.8} className="mt-px shrink-0 text-fg-subtle" aria-hidden />
            <p className="m-0 flex-1 text-[12.5px] leading-[1.5] text-fg-muted">
              {address} —{" "}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold"
              >
                Open directions
              </a>
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <Notebook size={16} strokeWidth={1.8} className="mt-px shrink-0 text-fg-subtle" aria-hidden />
            <p className="m-0 flex-1 text-[12.5px] leading-[1.55] text-fg-muted">
              Booking reference {bookingReference} · Admission for one · Reception on Level 2 ·
              Cancel free until {cancelDeadline}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock size={16} strokeWidth={1.8} className="shrink-0 text-fg-subtle" aria-hidden />
            <p className="m-0 flex-1 text-[12.5px] text-fg-muted">Reminder</p>
            <span className="flex h-9 items-center rounded-[10px] border border-line bg-surface px-3.5 text-[12.5px] font-bold text-fg">
              {REMINDER_MINUTES} minutes before
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TargetButton({
  selected,
  onSelect,
  label,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border px-2.5 py-4 transition-colors duration-150",
        selected ? "border-[1.5px] border-accent" : "border-line hover:border-accent",
      )}
    >
      <p className="m-0 text-[13px] font-bold text-fg">{label}</p>
      <p className="m-0 text-[11.5px] text-fg-subtle">{hint}</p>
    </button>
  );
}
