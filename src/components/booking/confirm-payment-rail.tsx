"use client";

import { CircleCheck } from "lucide-react";

import { useBooking } from "./booking-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { TAX_RATE, formatCurrency, pricingFor } from "@/lib/booking";
import { cn } from "@/lib/utils";

/**
 * Story 4.1 — "One-tap booking confirmation" (`Summary.dc.html`). El chequeo
 * final de disponibilidad y el cargo simulado los decide la página que
 * escucha `onConfirm`, que también sabe abrir Waitlist/PaymentError.
 * `submitting` lo deshabilita mientras hay un cobro en curso (E2E-01).
 */
export function ConfirmPaymentRail({
  onConfirm,
  submitting = false,
}: {
  onConfirm: () => void;
  submitting?: boolean;
}) {
  const { covered, draft } = useBooking();
  const pricing = pricingFor(covered);
  const canConfirm = draft.acceptedTerms && !submitting;

  return (
    <Card variant="content" className="border border-line p-5.5">
      <Eyebrow className="mb-3.5">Total</Eyebrow>

      <div className="flex flex-col gap-2.5">
        {pricing.covered ? (
          <>
            <Row label="Day pass" value="Included" valueClassName="text-accent-strong" />
            <Row label="Sales tax" value={formatCurrency(0)} />
          </>
        ) : (
          <>
            <Row label="Day pass" value={formatCurrency(pricing.subtotal)} />
            <Row
              label={`Estimated tax · ${(TAX_RATE * 100).toFixed(3)}%`}
              value={formatCurrency(pricing.tax)}
            />
          </>
        )}
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-sm font-bold text-fg">Charged today</span>
          <span className="text-xl font-extrabold text-fg">{formatCurrency(pricing.total)}</span>
        </div>
      </div>

      <Button
        size="lg"
        block
        disabled={!canConfirm}
        onClick={onConfirm}
        className="mt-4.5"
      >
        <CircleCheck size={16} strokeWidth={2} aria-hidden />
        {pricing.covered ? "Confirm booking" : `Confirm and pay ${formatCurrency(pricing.total)}`}
      </Button>

      <p className="mt-3.5 text-center text-[11.5px] leading-[1.55] text-fg-subtle">
        {pricing.covered
          ? "No card is charged for an included visit. Cancelling more than 24 hours ahead returns the visit to your monthly allowance."
          : "Processed by Stripe · PCI DSS Level 1"}
      </p>
    </Card>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className={cn("text-[13px] font-bold text-fg", valueClassName)}>{value}</span>
    </div>
  );
}
