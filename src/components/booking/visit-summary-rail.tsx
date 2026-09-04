"use client";

import Link from "next/link";

import { useBooking } from "./booking-context";
import { toneOf } from "@/components/lounges/lounge-thumb";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ADMISSION_COUNT, STAY_HOURS, TAX_RATE, formatCurrency, pricingFor } from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/**
 * Story 4.1 (Booking summary) + Story 4.2 (pricing). Rail derecho del paso 1
 * (`Main.dc.html`): resumen de la visita, desglose de precio y el botón que
 * avanza al paso 2, deshabilitado hasta elegir fecha y hora.
 */
export function VisitSummaryRail() {
  const { lounge, covered, draft } = useBooking();
  const pricing = pricingFor(covered);
  const canProceed = Boolean(draft.dateIso && draft.time);

  return (
    <Card variant="content" className="border border-line p-5.5">
      <Eyebrow className="mb-3.5">Your booking</Eyebrow>

      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span
          aria-hidden
          data-tone={toneOf(lounge.id)}
          className="lounge-hero size-11 shrink-0 rounded-xl"
        />
        <div>
          <p className="m-0 text-sm font-bold text-fg">{lounge.name}</p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">{lounge.neighborhood}</p>
        </div>
      </div>

      <dl className="m-0 flex flex-col gap-2.5 border-b border-line py-4">
        <Row label="Date" value={draft.dateIso ? formatWeekdayDate(draft.dateIso) : "Select a date"} />
        <Row label="Arrival" value={draft.time ?? "Select a time"} />
        <Row label="Stay" value={`Up to ${STAY_HOURS} hours`} />
        <Row label="Admission" value={`${ADMISSION_COUNT} member`} />
      </dl>

      <div className="flex flex-col gap-2.5 py-4">
        {pricing.covered ? (
          <Row label="This visit" value="Included" />
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
          <span className="text-sm font-bold text-fg">Total</span>
          <span className="text-xl font-extrabold text-fg">{formatCurrency(pricing.total)}</span>
        </div>
      </div>

      {canProceed ? (
        <Link
          href={`/lounges/${lounge.id}/book/payment`}
          className={cn(buttonVariants({ size: "lg", block: true }))}
        >
          Choose payment method
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={cn(buttonVariants({ size: "lg", block: true }))}
        >
          Choose payment method
        </button>
      )}

      <p className="mt-3.5 text-center text-[11.5px] leading-[1.55] text-fg-subtle">
        Free cancellation up to 24 hours before arrival.{" "}
        <a href="#" className="font-semibold">
          Cancellation policy
        </a>
      </p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[13px] text-fg-muted">{label}</dt>
      <dd className="m-0 text-[13px] font-bold text-fg">{value}</dd>
    </div>
  );
}
