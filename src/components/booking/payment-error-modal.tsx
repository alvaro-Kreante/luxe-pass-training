"use client";

import * as React from "react";
import { Clock, CreditCard, RefreshCw, TriangleAlert } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { formatCountdown } from "@/lib/booking";

/**
 * Story 4.1 — "Error handling: network issues, booking conflicts, system
 * unavailability" + "Retry options: try again, contact support, choose
 * different time" (`PaymentError.dc.html`).
 */
type Recovery = "retry" | "other-method" | "different-time";

export function PaymentErrorModal({
  open,
  onOpenChange,
  time,
  cardLabel,
  reference,
  secondsLeft,
  onTryAgain,
  onContactSupport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  time: string;
  cardLabel: string;
  reference: string;
  secondsLeft: number;
  onTryAgain: () => void;
  onContactSupport: () => void;
}) {
  const [selected, setSelected] = React.useState<Recovery>("retry");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="We could not take the payment"
      description={`Your bank declined the charge to the ${cardLabel}. Nothing was charged and the booking was not created.`}
      media={
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft">
          <TriangleAlert size={26} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <p className="m-0 flex-1 text-xs leading-[1.5] text-fg-subtle">
            Still stuck? Support has the reference above and can book on your behalf.
          </p>
          <Button variant="outline" size="md" onClick={onContactSupport}>
            Contact support
          </Button>
          <Button size="md" onClick={onTryAgain}>
            Try again
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-blush-1 px-4.5 py-3.5">
        <Clock size={18} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
        <p className="m-0 flex-1 text-[12.5px] text-fg-muted">
          Your {time} slot is still held for{" "}
          <strong className="text-fg">{formatCountdown(secondsLeft)}</strong> while you
          sort this out.
        </p>
        <span className="text-[11.5px] text-fg-subtle">Reference {reference}</span>
      </div>

      <p className="m-0 mb-2.5 mt-5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
        What you can do
      </p>

      <div className="flex flex-col gap-2.5">
        <PaymentOptionRow
          selected={selected === "retry"}
          onSelect={() => setSelected("retry")}
          leading={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
              <RefreshCw size={17} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
            </span>
          }
          title="Try the same card again"
          subtitle="Declines are often temporary. Your bank may ask you to approve the charge in their app."
        />
        <PaymentOptionRow
          selected={selected === "other-method"}
          onSelect={() => setSelected("other-method")}
          leading={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-blush-1">
              <CreditCard size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            </span>
          }
          title="Use another payment method"
          subtitle="Mastercard ending in 8801, a new card, Apple Pay or Google Pay."
        />
        <PaymentOptionRow
          selected={selected === "different-time"}
          onSelect={() => setSelected("different-time")}
          leading={
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-blush-1">
              <Clock size={17} strokeWidth={1.8} className="text-fg-subtle" aria-hidden />
            </span>
          }
          title="Choose a different time"
          subtitle="Go back to the date picker and keep your visit details."
        />
      </div>
    </Modal>
  );
}
