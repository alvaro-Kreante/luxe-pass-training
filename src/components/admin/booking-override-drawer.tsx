"use client";

import * as React from "react";
import { CalendarDays, Info } from "lucide-react";

import { Drawer } from "@/components/patterns/drawer";
import { Button } from "@/components/ui/button";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { Switch } from "@/components/ui/switch";
import type { UpcomingBooking } from "@/lib/admin";
import { cn } from "@/lib/utils";

type ChangeType = "reschedule" | "move" | "cancel";

const ARRIVAL_SLOTS = [
  { time: "9:00 AM", note: "4 left", full: false },
  { time: "10:00 AM", note: "full", full: true },
  { time: "11:00 AM", note: "2 left", full: false },
  { time: "12:00 PM", note: "full", full: true },
] as const;

export interface BookingOverrideResult {
  changeType: ChangeType;
  newTime?: string;
  overrideApplied: boolean;
}

/**
 * Story 8.1 — "Booking modification capabilities", con el override explícito
 * de las restricciones del local que fija DESIGN-SYSTEM.md §6 (Fase 8).
 * Artboard: docs/design/epic-8-admin-support/BookingOverride.dc.html.
 *
 * "Move to another lounge" no expande ningún formulario propio: el artboard
 * solo dibuja la opción colapsada, sin una segunda pantalla de qué lounge
 * elegir — no se inventa una.
 */
export function BookingOverrideDrawer({
  open,
  onOpenChange,
  memberName,
  booking,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  booking: UpcomingBooking;
  onApply: (result: BookingOverrideResult) => void;
}) {
  const [changeType, setChangeType] = React.useState<ChangeType>("reschedule");
  const [selectedTime, setSelectedTime] = React.useState("9:00 AM");
  const [overrideEnabled, setOverrideEnabled] = React.useState(false);

  function selectSlot(slot: (typeof ARRIVAL_SLOTS)[number]) {
    if (slot.full && !overrideEnabled) return;
    setSelectedTime(slot.time);
  }

  function applyChange() {
    onApply({
      changeType,
      newTime: changeType === "reschedule" ? selectedTime : undefined,
      overrideApplied: changeType === "reschedule" && overrideEnabled,
    });
    onOpenChange(false);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      dark
      width={472}
      eyebrow={`${memberName} · ${booking.reference}`}
      title="Modify booking"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" className="normal-case" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button block onClick={applyChange}>
            Apply change
          </Button>
        </div>
      }
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Booked now</p>
      <div className="mt-2.5 rounded-2xl border border-line bg-panel-black px-4.5 py-4">
        <p className="m-0 text-sm font-bold text-fg">
          {booking.lounge} · {booking.area}
        </p>
        <p className="m-0 mt-1.5 text-[12.5px] text-fg-muted">{booking.detail}</p>
      </div>

      <p className="mb-2.5 mt-4 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        What are you changing?
      </p>
      <div role="radiogroup" aria-label="What are you changing?" className="flex flex-col gap-2.5">
        <PaymentOptionRow
          selected={changeType === "reschedule"}
          onSelect={() => setChangeType("reschedule")}
          title="Date or arrival time"
        />
        <PaymentOptionRow selected={changeType === "move"} onSelect={() => setChangeType("move")} title="Move to another lounge" />
        <PaymentOptionRow selected={changeType === "cancel"} onSelect={() => setChangeType("cancel")} title="Cancel the booking" />
      </div>

      {changeType === "reschedule" ? (
        <>
          <p className="mb-2.5 mt-4 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">New date</p>
          <div className="flex h-[50px] items-center gap-3 rounded-xl border-[1.5px] border-accent bg-panel-black px-4 shadow-ring">
            <CalendarDays size={18} strokeWidth={1.7} className="text-accent" aria-hidden />
            <span className="flex-1 text-[13.5px] font-bold text-fg">Saturday, September 21</span>
          </div>

          <p className="mb-2.5 mt-4.5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Arrival time</p>
          <div className="grid grid-cols-4 gap-2.5">
            {ARRIVAL_SLOTS.map((slot) => {
              const selected = selectedTime === slot.time;
              const blocked = slot.full && !overrideEnabled;
              return (
                <button
                  key={slot.time}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${slot.time} · ${slot.note}`}
                  onClick={() => selectSlot(slot)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition-colors duration-150",
                    selected ? "border-accent bg-accent" : "border-line",
                    blocked && "cursor-not-allowed border-dashed",
                  )}
                >
                  <p className={cn("m-0 text-[13.5px] font-bold", selected ? "text-on-accent" : "text-fg-muted")}>
                    {slot.time}
                  </p>
                  <p className={cn("m-0 mt-0.5 text-[11.5px]", selected ? "text-on-accent/85" : "text-fg-subtle")}>
                    {slot.note}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-3.5 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4.5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[13px] font-bold text-fg">Override the lounge&apos;s rules</p>
              <p className="m-0 mt-1.5 text-[11.5px] leading-[1.5] text-fg-muted">
                {booking.lounge} caps this slot and asks for notice. The lounge sees the override, your name and this
                case number on their list.
              </p>
            </div>
            <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} label="Override the lounge's rules" />
          </div>
        </>
      ) : null}

      {changeType === "cancel" ? (
        <p className="mt-4 text-[13px] text-fg-muted">
          This cancels {booking.reference} immediately and notifies the member.
        </p>
      ) : null}

      <p className="mt-5 flex items-start gap-2.5 text-[11.5px] text-fg-subtle">
        <Info size={15} strokeWidth={1.8} className="mt-px shrink-0" aria-hidden />
        {memberName.split(" ")[0]} gets an email and a push the moment you apply this. Her pass is reissued with the
        same number, {booking.reference}, and the old QR stops working.
      </p>
    </Drawer>
  );
}
