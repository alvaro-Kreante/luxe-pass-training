"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { useBooking } from "@/components/booking/booking-context";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { ConfirmPaymentRail } from "@/components/booking/confirm-payment-rail";
import { PaymentErrorModal } from "@/components/booking/payment-error-modal";
import { SlotHoldBadge } from "@/components/booking/slot-hold-badge";
import { TermsPolicyCard } from "@/components/booking/terms-policy-card";
import { WaitlistModal } from "@/components/booking/waitlist-modal";
import { AppShell } from "@/components/patterns/app-shell";
import { StepFlowRail } from "@/components/patterns/step-flow-rail";
import {
  NEW_CARD_OPTION_ID,
  SAMPLE_PAYMENT_METHODS,
  errorReference,
  isAtRiskOfWaitlist,
  paymentWillDecline,
} from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";

/**
 * Story 4.1 — Seamless Booking Flow. Paso 3 de 3 "Review and confirm"
 * (`Summary.dc.html`). El chequeo final de disponibilidad decide entre
 * confirmar, ofrecer la waitlist (`Waitlist.dc.html`) o mostrar el error de
 * pago (`PaymentError.dc.html`) — ver flow-complete-booking-journey.md.
 */
function cardLabelFor(paymentMethodId: string | null): string {
  if (paymentMethodId === NEW_CARD_OPTION_ID) return "new card";
  const method = SAMPLE_PAYMENT_METHODS.find((m) => m.id === paymentMethodId);
  return method ? `${method.brand === "visa" ? "Visa" : "Mastercard"} ending in ${method.last4}` : "card";
}

export default function SummaryPage() {
  const router = useRouter();
  const { lounge, covered, draft, holdSecondsLeft } = useBooking();
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
  const [paymentErrorOpen, setPaymentErrorOpen] = React.useState(false);

  React.useEffect(() => {
    if (!draft.dateIso || !draft.time) {
      router.replace(`/lounges/${lounge.id}/book`);
    }
  }, [draft.dateIso, draft.time, lounge.id, router]);

  if (!draft.dateIso || !draft.time) return null;

  function handleConfirm() {
    if (isAtRiskOfWaitlist(draft.seatsLeft)) {
      setWaitlistOpen(true);
      return;
    }

    if (!covered && paymentWillDecline(draft.paymentMethodId)) {
      setPaymentErrorOpen(true);
      return;
    }

    router.push(`/lounges/${lounge.id}/book/confirmed`);
  }

  return (
    <AppShell padded={false} blurred={waitlistOpen || paymentErrorOpen}>
      <StepFlowRail
        lounge={lounge}
        backHref={`/lounges/${lounge.id}/book/payment`}
        backLabel="Back to payment"
        address={`${formatWeekdayDate(draft.dateIso)} · ${draft.time} · Admission for one`}
        trailingBadge={<SlotHoldBadge secondsLeft={holdSecondsLeft} />}
        hideFreshness
        topbarRight={
          <span className="flex items-center gap-2 text-[12.5px] font-bold tracking-[0.04em] text-fg-muted">
            <ShieldCheck size={16} strokeWidth={1.8} aria-hidden />
            Secure checkout
          </span>
        }
        stepCurrent={3}
        stepTotal={3}
        stepLabel="Review and confirm"
        rail={<ConfirmPaymentRail onConfirm={handleConfirm} />}
      >
        <BookingSummaryCard />
        <TermsPolicyCard />
      </StepFlowRail>

      <WaitlistModal
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        lounge={lounge}
        dateIso={draft.dateIso}
        time={draft.time}
        onChangeDate={() => {
          setWaitlistOpen(false);
          router.push(`/lounges/${lounge.id}/book`);
        }}
        onJoinWaitlist={() => setWaitlistOpen(false)}
      />

      <PaymentErrorModal
        open={paymentErrorOpen}
        onOpenChange={setPaymentErrorOpen}
        time={draft.time}
        cardLabel={cardLabelFor(draft.paymentMethodId)}
        reference={errorReference(lounge.id, draft.dateIso, draft.time)}
        secondsLeft={holdSecondsLeft}
        onTryAgain={() => setPaymentErrorOpen(false)}
        onContactSupport={() => setPaymentErrorOpen(false)}
      />
    </AppShell>
  );
}
