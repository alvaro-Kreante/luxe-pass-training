"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { StatusChip } from "@/components/ui/status-chip";
import {
  NO_SHOW_FEE,
  NO_SHOW_REASONS,
  formatCurrency,
  type NoShowReason,
  type PartnerGuest,
} from "@/lib/partner";

/**
 * Story 7.1 — "No-show reporting functionality". DESIGN-SYSTEM.md §5 patrón
 * 18 (modal oscuro, 620px). Artboard: NoShow.dc.html.
 *
 * El eyebrow del artboard ("Story 7.1 · attendance") parece una anotación
 * del propio proceso de diseño, no copy de producto — aquí solo "Attendance".
 */
export function NoShowModal({
  open,
  onOpenChange,
  guest,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: PartnerGuest;
  onConfirm: (id: string, reason: NoShowReason) => void;
}) {
  const [reason, setReason] = React.useState<NoShowReason>(NO_SHOW_REASONS[0].value);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      dark
      width={620}
      eyebrow="Attendance"
      title="Report a no-show"
      footer={
        <div className="flex gap-3">
          <Button block onClick={() => onConfirm(guest.id, reason)}>
            Report no-show
          </Button>
          <Button
            variant="ghost"
            className="w-45 shrink-0 whitespace-nowrap px-3"
            onClick={() => onOpenChange(false)}
          >
            Keep as pending
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-panel-black px-4.5 py-4">
        <span className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-accent font-display text-base font-bold text-on-accent">
          {guest.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[15px] font-bold text-fg">{guest.name}</p>
          <p className="m-0 mt-0.5 truncate text-xs text-fg-subtle">
            {guest.arrivalTime} arrival · {guest.id} · admission {guest.admissionWindowLabel.toLowerCase()}
          </p>
        </div>
        <StatusChip dashed className="shrink-0">
          Not checked in
        </StatusChip>
      </div>

      <p className="m-0 mb-3 mt-5.5 text-[13px] font-semibold text-fg-muted">What happened?</p>
      <div role="radiogroup" aria-label="What happened?" className="flex flex-col gap-2.5">
        {NO_SHOW_REASONS.map((option) => (
          <PaymentOptionRow
            key={option.value}
            selected={reason === option.value}
            onSelect={() => setReason(option.value)}
            title={option.label}
            subtitle={option.description}
          />
        ))}
      </div>

      <div className="mt-4.5 flex gap-3 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4.5 py-4">
        <Info size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="m-0 text-[12.5px] font-bold text-fg">What reporting this does</p>
          <p className="m-0 mt-1.5 text-xs leading-[1.6] text-fg-muted">
            The visit closes as a no-show and appears in the member&apos;s own history. A flat{" "}
            {formatCurrency(NO_SHOW_FEE)} no-show fee is charged to the card on their membership,
            and three no-shows in twelve months pause their bookings for 30 days. Your revenue
            attribution for the day is unaffected — the fee is shared under the partner agreement.
          </p>
        </div>
      </div>
    </Modal>
  );
}
