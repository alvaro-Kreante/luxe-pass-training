"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { useBooking } from "@/components/booking/booking-context";
import { PaymentMethodForm } from "@/components/booking/payment-method-form";
import { PaymentSummaryRail } from "@/components/booking/payment-summary-rail";
import { SlotHoldBadge } from "@/components/booking/slot-hold-badge";
import { AppShell } from "@/components/patterns/app-shell";
import { StepFlowRail } from "@/components/patterns/step-flow-rail";
import { formatWeekdayDate } from "@/lib/lounge-profile";

/**
 * Story 4.2 — Payment Processing. Paso 2 de 3 "Payment method"
 * (`Payment.dc.html` / `MembershipCovered.dc.html`).
 */
export default function PaymentPage() {
  const router = useRouter();
  const { lounge, draft, holdSecondsLeft } = useBooking();

  React.useEffect(() => {
    if (!draft.dateIso || !draft.time) {
      router.replace(`/lounges/${lounge.id}/book`);
    }
  }, [draft.dateIso, draft.time, lounge.id, router]);

  if (!draft.dateIso || !draft.time) return null;

  return (
    <AppShell padded={false}>
      <StepFlowRail
        lounge={lounge}
        backHref={`/lounges/${lounge.id}/book`}
        backLabel="Back to visit details"
        address={`${formatWeekdayDate(draft.dateIso)} · ${draft.time} · Admission for one`}
        trailingBadge={<SlotHoldBadge secondsLeft={holdSecondsLeft} />}
        hideFreshness
        topbarRight={
          <span className="flex items-center gap-2 text-[12.5px] font-bold tracking-[0.04em] text-fg-muted">
            <ShieldCheck size={16} strokeWidth={1.8} aria-hidden />
            Secure checkout
          </span>
        }
        stepCurrent={2}
        stepTotal={3}
        stepLabel="Payment method"
        rail={<PaymentSummaryRail />}
      >
        <PaymentMethodForm />
      </StepFlowRail>
    </AppShell>
  );
}
