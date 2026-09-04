"use client";

import Link from "next/link";

import { useBooking } from "./booking-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ADMISSION_COUNT, TAX_RATE, formatCurrency, pricingFor } from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/**
 * Story 4.2 — rail derecho del paso 2 (`Payment.dc.html` /
 * `MembershipCovered.dc.html`): resumen del pedido, desglose de precio y el
 * botón que avanza al paso 3, deshabilitado hasta elegir método de pago.
 */
export function PaymentSummaryRail() {
  const { lounge, covered, draft } = useBooking();
  const pricing = pricingFor(covered);
  const canProceed = covered || draft.paymentMethodId !== null;

  return (
    <Card variant="content" className="border border-line p-5.5">
      <Eyebrow className="mb-3.5">Order summary</Eyebrow>

      <div className="flex flex-col gap-2.5 border-b border-line pb-4">
        <Row
          label="Visit"
          value={`${draft.dateIso ? formatWeekdayDate(draft.dateIso) : ""} · ${draft.time ?? ""}`}
        />
        <Row label="Admission" value={`${ADMISSION_COUNT} member`} />
      </div>

      <div className="flex flex-col gap-2.5 py-4">
        {pricing.covered ? (
          <>
            <Row label="Day pass" value="Included" valueClassName="text-accent-strong" />
            <Row label="Sales tax" value={formatCurrency(0)} />
          </>
        ) : (
          <>
            <Row label="Day pass" value={formatCurrency(pricing.subtotal)} />
            <Row
              label={`Sales tax · NY ${(TAX_RATE * 100).toFixed(3)}%`}
              value={formatCurrency(pricing.tax)}
            />
          </>
        )}
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-sm font-bold text-fg">Total due today</span>
          <span className="text-xl font-extrabold text-fg">{formatCurrency(pricing.total)}</span>
        </div>
      </div>

      {canProceed ? (
        <Link
          href={`/lounges/${lounge.id}/book/summary`}
          className={cn(buttonVariants({ size: "lg", block: true }))}
        >
          Review and confirm
        </Link>
      ) : (
        <Button size="lg" block disabled>
          Review and confirm
        </Button>
      )}

      <p className="mt-3.5 text-center text-[11.5px] leading-[1.55] text-fg-subtle">
        {pricing.covered
          ? "No card is charged for an included visit. Cancelling more than 24 hours ahead returns the visit to your monthly allowance."
          : "Your card is not charged until you confirm the booking on the next step."}
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
