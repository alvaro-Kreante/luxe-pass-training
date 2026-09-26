"use client";

import * as React from "react";
import { CalendarDays, Info } from "lucide-react";

import { Drawer } from "@/components/patterns/drawer";
import { Button } from "@/components/ui/button";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { Switch } from "@/components/ui/switch";
import { SLOT_DEFS } from "@/lib/booking";
import type { UpcomingBooking } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import { cancelBookingAsAdmin, rescheduleBooking } from "@/lib/admin";
import { cn } from "@/lib/utils";

type ChangeType = "reschedule" | "move" | "cancel";

interface AvailabilityRow {
  band: string;
  seats_left: number;
}

/**
 * Story 8.1 — "Booking modification capabilities", con el override explícito
 * de las restricciones del local que fija DESIGN-SYSTEM.md §6 (Fase 8).
 * Artboard: docs/design/epic-8-admin-support/BookingOverride.dc.html.
 *
 * Backend real (22 sept 2026): `admin_reschedule_booking`/
 * `admin_cancel_booking` (`supabase/schemas/support_tickets.sql`). El
 * artboard dibuja cuatro horarios ficticios ("9:00 AM"–"12:00 PM") que no
 * existen en el dominio real de `bookings.slot_time` — se sustituyen por los
 * cinco horarios reales (`SLOT_DEFS`, `src/lib/booking.ts`), con las plazas
 * de cada uno consultadas en vivo (`lounge_availability_range`) para la
 * fecha elegida. Desviación anotada en `docs/design/COMPONENT-MAP.md`.
 *
 * "Move to another lounge" sigue sin expandir ningún formulario propio: el
 * artboard solo dibuja la opción colapsada, sin una segunda pantalla de qué
 * lounge elegir — no se inventa una.
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
  booking: UpcomingBooking & { bookingId: string; loungeId: string; date: string; band: string; slotTime: string };
  onApply: () => void | Promise<void>;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [changeType, setChangeType] = React.useState<ChangeType>("reschedule");
  const [newDate, setNewDate] = React.useState(booking.date);
  const [selectedSlot, setSelectedSlot] = React.useState(SLOT_DEFS.find((s) => s.time === booking.slotTime) ?? SLOT_DEFS[0]);
  const [overrideEnabled, setOverrideEnabled] = React.useState(false);
  const [seatsByBand, setSeatsByBand] = React.useState<Record<string, number>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    supabase
      .rpc("lounge_availability_range", { p_lounge_id: booking.loungeId, p_from: newDate, p_to: newDate })
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as AvailabilityRow[];
        setSeatsByBand(Object.fromEntries(rows.map((r) => [r.band, r.seats_left])));
      });
    return () => {
      active = false;
    };
  }, [supabase, open, booking.loungeId, newDate]);

  function selectSlot(slot: (typeof SLOT_DEFS)[number]) {
    const seats = seatsByBand[slot.band];
    const full = typeof seats === "number" && seats <= 0;
    if (full && !overrideEnabled) return;
    setSelectedSlot(slot);
  }

  async function applyChange() {
    setSubmitting(true);
    setError("");
    try {
      if (changeType === "reschedule") {
        await rescheduleBooking(supabase, booking.bookingId, newDate, selectedSlot.band, selectedSlot.time, overrideEnabled);
      } else if (changeType === "cancel") {
        await cancelBookingAsAdmin(supabase, booking.bookingId);
      }
      await onApply();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply this change");
    } finally {
      setSubmitting(false);
    }
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
          <Button block onClick={applyChange} disabled={submitting || changeType === "move"}>
            {submitting ? "Applying…" : "Apply change"}
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
          <label className="flex h-[50px] items-center gap-3 rounded-xl border-[1.5px] border-accent bg-panel-black px-4 shadow-ring">
            <CalendarDays size={18} strokeWidth={1.7} className="text-accent" aria-hidden />
            <input
              type="date"
              aria-label="New date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
              className="flex-1 bg-transparent text-[13.5px] font-bold text-fg focus:outline-none"
            />
          </label>

          <p className="mb-2.5 mt-4.5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Arrival time</p>
          <div className="grid grid-cols-3 gap-2.5">
            {SLOT_DEFS.map((slot) => {
              const selected = selectedSlot.time === slot.time;
              const seats = seatsByBand[slot.band];
              const full = typeof seats === "number" && seats <= 0;
              const blocked = full && !overrideEnabled;
              return (
                <button
                  key={slot.time}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${slot.time} · ${full ? "full" : typeof seats === "number" ? `${seats} left` : "—"}`}
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
                    {full ? "full" : typeof seats === "number" ? `${seats} left` : "—"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-3.5 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4.5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[13px] font-bold text-fg">Override the lounge&apos;s rules</p>
              <p className="m-0 mt-1.5 text-[11.5px] leading-[1.5] text-fg-muted">
                {booking.lounge} caps this slot. Overriding books the member in even without a free seat on record.
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

      {changeType === "move" ? (
        <p className="mt-4 text-[13px] text-fg-muted">
          Moving to another lounge is not available from this console yet — cancel this booking and start a new one
          instead.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-[12.5px] font-bold text-accent-strong">{error}</p> : null}

      <p className="mt-5 flex items-start gap-2.5 text-[11.5px] text-fg-subtle">
        <Info size={15} strokeWidth={1.8} className="mt-px shrink-0" aria-hidden />
        {memberName.split(" ")[0]} gets an email and a push the moment you apply this. Her pass is reissued with the
        same number, {booking.reference}, and the old QR stops working.
      </p>
    </Drawer>
  );
}
