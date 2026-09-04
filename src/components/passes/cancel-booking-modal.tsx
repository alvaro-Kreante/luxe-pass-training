"use client";

import * as React from "react";
import { Calendar, Check, Clock, Mail, PhoneCall, RotateCcw } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import { SelectableChip } from "@/components/ui/chip";
import { DetailRow } from "@/components/ui/detail-row";
import { SAMPLE_MEMBER } from "@/lib/member";
import { SAMPLE_PAYMENT_METHODS } from "@/lib/booking";
import {
  LATE_CANCELLATION_FEE_LABEL,
  VISITS_THIS_MONTH,
  isFreeCancellation,
  type UpcomingBooking,
} from "@/lib/passes";

/**
 * Story 6.1 — "Modification options: Cancel", "No show policy enforcement -
 * flat fee" y "24-hour advance notice requirement for cancellation".
 * `Cancel.dc.html` (más de 24h) y `CancelFee.dc.html` (menos de 24h) son dos
 * estados del mismo diálogo: cuál se muestra lo decide `isFreeCancellation`.
 */
const CANCEL_REASONS = ["Plans changed", "Booked by mistake", "Found a better time", "Going somewhere else", "Other"];

const card = SAMPLE_PAYMENT_METHODS.find((method) => method.isDefault) ?? SAMPLE_PAYMENT_METHODS[0];

export function CancelBookingModal({
  open,
  onOpenChange,
  booking,
  onConfirmCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: UpcomingBooking;
  onConfirmCancel: () => void;
}) {
  const [reason, setReason] = React.useState<string | null>(null);
  const free = booking.hoursUntilArrival !== null && isFreeCancellation(booking.hoursUntilArrival);
  const daysAhead = booking.hoursUntilArrival !== null ? Math.round(booking.hoursUntilArrival / 24) : 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={free ? "Cancel this visit?" : "Cancelling within 24 hours"}
      description={`${booking.loungeName} · ${booking.dateTimeLabel}${booking.reference ? ` · ${booking.reference}` : ""}`}
      media={
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft">
          {free ? (
            <Calendar size={26} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
          ) : (
            <Clock size={26} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
          )}
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <p className="m-0 flex-1 text-xs leading-[1.5] text-fg-subtle">
            {free
              ? `Free until ${booking.freeCancellationDeadlineLabel}.`
              : "Late cancellations are recorded on your account."}
          </p>
          <Button variant="outline" size="md" onClick={() => onOpenChange(false)}>
            Keep booking
          </Button>
          <Button size="md" onClick={onConfirmCancel}>
            {free ? "Cancel booking" : `Cancel and pay ${LATE_CANCELLATION_FEE_LABEL}`}
          </Button>
        </div>
      }
    >
      {free ? (
        <>
          <HighlightRow
            icon={<Check size={15} strokeWidth={2.2} className="text-accent-strong" aria-hidden />}
            title={`Free cancellation — you are ${daysAhead} day${daysAhead === 1 ? "" : "s"} ahead of the deadline`}
            detail={`Nothing is charged. You have until ${booking.freeCancellationDeadlineLabel} to cancel this visit at no cost.`}
          />

          <p className="m-0 mb-2.5 mt-5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
            What happens next
          </p>
          <div className="flex flex-col gap-2.5">
            <DetailRow
              icon={<RotateCcw size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
              text={
                <>
                  The visit returns to your allowance —{" "}
                  <strong className="text-fg">
                    {VISITS_THIS_MONTH.used - 1} of {VISITS_THIS_MONTH.included} used this month
                  </strong>
                </>
              }
            />
            <DetailRow
              icon={<Calendar size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
              text={
                <>
                  Confirmation <strong className="text-fg">{booking.reference}</strong> stops working right away
                </>
              }
            />
            <DetailRow
              icon={<Mail size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
              text={
                <>
                  We email a cancellation notice to <strong className="text-fg">{SAMPLE_MEMBER.email}</strong>
                </>
              }
            />
          </div>

          <p className="m-0 mb-2.5 mt-5 text-[13px] font-semibold text-fg-muted">
            Why are you cancelling? <span className="font-normal text-fg-subtle">Optional</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((option) => (
              <SelectableChip key={option} selected={reason === option} onToggle={() => setReason(option)}>
                {option}
              </SelectableChip>
            ))}
          </div>
        </>
      ) : (
        <>
          <HighlightRow
            icon={<Clock size={15} strokeWidth={2} className="text-accent-strong" aria-hidden />}
            title={`Arrival is in ${booking.hoursUntilArrival} hours — the flat fee applies`}
            detail={`The deadline for a free cancellation was ${booking.freeCancellationDeadlineLabel}. Cancelling now charges the late cancellation fee and the visit does not return to your monthly allowance.`}
          />

          <div className="mt-3.5 rounded-content border border-line bg-surface-sunken p-4.5">
            <div className="flex items-center justify-between text-[13px] text-fg-muted">
              <span>Late cancellation fee</span>
              <span className="font-bold text-fg">{LATE_CANCELLATION_FEE_LABEL}</span>
            </div>
            <div className="my-3 h-px bg-line" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-fg">Charged today</span>
              <span className="text-base font-extrabold text-fg">{LATE_CANCELLATION_FEE_LABEL}</span>
            </div>
            <div className="mt-3.5 flex items-center gap-2.5">
              <CardBrandBadge brand={card.brand} />
              <p className="m-0 flex-1 text-xs text-fg-subtle">
                {card.brand === "visa" ? "Visa" : "Mastercard"} ending {card.last4} · the card on file for your
                membership
              </p>
              <span className="text-xs font-semibold text-accent-strong">Change</span>
            </div>
          </div>

          <p className="m-0 mb-2.5 mt-5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
            Before you do
          </p>
          <div className="flex flex-col gap-2">
            <BeforeYouDoRow
              icon={<Clock size={16} strokeWidth={1.8} className="text-accent-strong" aria-hidden />}
              title="Keep it and arrive late instead"
              detail={`Admission stays open until ${booking.lateArrivalWindowLabel}, two hours after your slot`}
            />
            <BeforeYouDoRow
              icon={<PhoneCall size={16} strokeWidth={1.8} className="text-accent-strong" aria-hidden />}
              title="Ask member support to review the fee"
              detail="Illness, travel disruption and lounge closures are waived case by case"
            />
          </div>
        </>
      )}
    </Modal>
  );
}

function HighlightRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-[1.5px] border-accent bg-surface px-4 py-3.5 shadow-ring">
      <span className="mt-0.5 flex size-6.5 shrink-0 items-center justify-center rounded-full bg-accent-soft">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-fg">{title}</p>
        <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-fg-subtle">{detail}</p>
      </div>
    </div>
  );
}

function BeforeYouDoRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-bold text-fg">{title}</p>
        <p className="m-0 mt-0.5 text-xs text-fg-subtle">{detail}</p>
      </div>
    </div>
  );
}
