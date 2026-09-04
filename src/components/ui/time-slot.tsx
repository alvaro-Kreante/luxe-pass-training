import type { BookingSlot } from "@/lib/booking";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Slot de hora (Fase 5). radius 12px, padding 10px 8px,
 * hora 13.5px/700 + plazas 11.5px. Libre / seleccionado / completo.
 */
export interface TimeSlotGridProps {
  slots: BookingSlot[];
  selectedTime?: string;
  onSelect: (slot: BookingSlot) => void;
}

export function TimeSlotGrid({ slots, selectedTime, onSelect }: TimeSlotGridProps) {
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {slots.map((slot) => (
        <TimeSlotButton
          key={slot.time}
          slot={slot}
          selected={selectedTime === slot.time}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function statusLabel(slot: BookingSlot): string {
  if (slot.status === "full") return "Fully booked";
  if (slot.status === "closed") return "Closed";
  if (slot.status === "past") return "Passed";

  return `${slot.seatsLeft} ${slot.seatsLeft === 1 ? "spot" : "spots"}`;
}

function TimeSlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: BookingSlot;
  selected: boolean;
  onSelect: (slot: BookingSlot) => void;
}) {
  const base = "rounded-xl px-2 py-2.5 text-center";

  if (slot.status !== "open") {
    return (
      <div
        className={cn(
          base,
          "cursor-default border border-dashed border-line bg-blush-1",
        )}
      >
        <p className="m-0 text-[13.5px] font-bold text-fg-subtle">{slot.time}</p>
        <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{statusLabel(slot)}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${slot.time} · ${statusLabel(slot)}`}
      onClick={() => onSelect(slot)}
      className={cn(
        base,
        "cursor-pointer border transition-colors duration-150 hover:border-accent",
        selected ? "border-accent bg-accent" : "border-line bg-surface",
      )}
    >
      <p
        className={cn(
          "m-0 text-[13.5px] font-bold",
          selected ? "text-on-accent" : "text-fg",
        )}
      >
        {slot.time}
      </p>
      <p
        className={cn(
          "m-0 mt-0.5 text-[11.5px]",
          selected ? "text-on-accent/85" : "text-fg-subtle",
        )}
      >
        {statusLabel(slot)}
      </p>
    </button>
  );
}
