"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { addMinutesToTime } from "@/lib/booking";
import { addDays } from "@/lib/availability";
import { formatWeekdayDate } from "@/lib/lounge-profile";
import type { Lounge } from "@/lib/lounges";

/**
 * Story 4.1 — "If full option to be on the waitlist" (`Waitlist.dc.html`).
 * Las tres alternativas reutilizan la "Fila de opción" (§4) — el mismo
 * componente que las tarjetas guardadas de pago.
 */
type Selection = "join" | 0 | 1 | 2;

export function WaitlistModal({
  open,
  onOpenChange,
  lounge,
  dateIso,
  time,
  onChangeDate,
  onJoinWaitlist,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lounge: Lounge;
  dateIso: string;
  time: string;
  onChangeDate: () => void;
  onJoinWaitlist: () => void;
}) {
  const [selected, setSelected] = React.useState<Selection>("join");
  const laterToday = addMinutesToTime(time, 90);
  const nextDay = addDays(dateIso, 1);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="That slot just filled up"
      description={`The ${time} slot on ${formatWeekdayDate(dateIso)} was taken while you were reviewing. Nothing has been charged.`}
      media={
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft">
          <Clock size={26} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <p className="m-0 flex-1 text-xs leading-[1.5] text-fg-subtle">
            You can leave the waitlist at any time from My Pass.
          </p>
          <Button variant="outline" size="md" onClick={onChangeDate}>
            Change date
          </Button>
          <Button size="md" onClick={onJoinWaitlist}>
            Join waitlist
          </Button>
        </div>
      }
    >
      <PaymentOptionRow
        selected={selected === "join"}
        onSelect={() => setSelected("join")}
        title={
          <span className="flex items-center gap-2.5">
            Join the waitlist for {time}
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-fg">
              1st in line
            </span>
          </span>
        }
        subtitle="If the slot opens we hold it for 30 minutes and notify you by push and email. Your card is only charged once you accept."
      />

      <p className="m-0 mb-2.5 mt-5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
        Or pick another time
      </p>

      <div className="flex flex-col gap-2.5">
        <PaymentOptionRow
          selected={selected === 0}
          onSelect={() => setSelected(0)}
          title={`${formatWeekdayDate(dateIso)} · ${laterToday}`}
          subtitle="Same day, 90 minutes later"
          trailing={<span className="text-[12.5px] font-bold text-accent-strong">4 spots</span>}
        />
        <PaymentOptionRow
          selected={selected === 1}
          onSelect={() => setSelected(1)}
          title={`${formatWeekdayDate(nextDay)} · ${time}`}
          subtitle="Same time, next day"
          trailing={<span className="text-[12.5px] font-bold text-accent-strong">6 spots</span>}
        />
        <PaymentOptionRow
          selected={selected === 2}
          onSelect={() => setSelected(2)}
          title={`The Vestry · ${formatWeekdayDate(dateIso)} · ${time}`}
          subtitle={`SoHo · 1.8 mi from ${lounge.name}`}
          trailing={<span className="text-[12.5px] font-bold text-accent-strong">9 spots</span>}
        />
      </div>
    </Modal>
  );
}
