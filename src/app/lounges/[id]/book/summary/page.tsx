"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useCheckoutElements } from "@stripe/react-stripe-js/checkout";

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
  bookingReferenceFromId,
  confirmBooking,
  errorReference,
  joinWaitlist,
  type BookingRequest,
} from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";
import { chargeSavedPaymentMethod } from "@/lib/stripe-payments";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 4.1/4.2 — paso 3 "Review and confirm" (`Summary.dc.html`). El
 * artboard es explícito: "One tap confirms your visit and charges your
 * card. Availability is checked again at this moment" — el cargo real
 * (Stripe) y el chequeo final de disponibilidad (`confirm_booking`) ocurren
 * en el mismo tap, el cargo primero. Tres caminos según cómo se paga:
 *
 *   - Cubierta por membresía: sin pago, directo a `confirm_booking`.
 *   - Tarjeta guardada: `chargeSavedPaymentMethod` (Edge Function,
 *     servidor a servidor, sin `<PaymentElement>`).
 *   - Tarjeta nueva: `checkout.confirm()` de Stripe sobre el
 *     `<CheckoutElementsProvider>` que vive en `BookLayout` — montado en el
 *     paso 2, sigue disponible aquí porque es el mismo layout, no una
 *     página nueva.
 *
 * El pago (si lo hay) se confirma *antes* de `confirm_booking`: así una
 * tarjeta rechazada nunca deja una reserva real con su plaza ya consumida.
 */
type PaymentOutcome =
  | { ok: true; paymentId: string | null }
  | { ok: false; message: string; paymentId: string | null };

export default function SummaryPage() {
  const router = useRouter();
  const { lounge, draft } = useBooking();

  React.useEffect(() => {
    if (!draft.dateIso || !draft.time) {
      router.replace(`/lounges/${lounge.id}/book`);
    }
  }, [draft.dateIso, draft.time, lounge.id, router]);

  if (!draft.dateIso || !draft.time || !draft.band) return null;

  return draft.paymentMethodId === NEW_CARD_OPTION_ID ? (
    <SummaryScreenNewCard />
  ) : (
    <SummaryScreenOtherPayment />
  );
}

/** Tarjeta nueva — la única rama que puede llamar a `useCheckoutElements()` (exige un `<CheckoutElementsProvider>` montado). */
function SummaryScreenNewCard() {
  const { checkoutSession } = useBooking();
  const checkoutResult = useCheckoutElements();

  const chargePayment = React.useCallback(async (): Promise<PaymentOutcome> => {
    const paymentId = checkoutSession?.paymentId ?? null;

    if (checkoutResult.type !== "success") {
      return {
        ok: false,
        message:
          checkoutResult.type === "error"
            ? checkoutResult.error.message
            : "The payment form is still loading.",
        paymentId,
      };
    }

    const result = await checkoutResult.checkout.confirm({ redirect: "if_required" });

    if (result.type === "success") return { ok: true, paymentId };
    return { ok: false, message: result.error.message, paymentId };
  }, [checkoutResult, checkoutSession]);

  return <SummaryScreenBody chargePayment={chargePayment} />;
}

/** Cubierta por membresía o tarjeta guardada — ninguna necesita `<PaymentElement>`. */
function SummaryScreenOtherPayment() {
  const { lounge, covered, draft } = useBooking();

  const chargePayment = React.useCallback(async (): Promise<PaymentOutcome> => {
    if (covered) return { ok: true, paymentId: null };

    const result = await chargeSavedPaymentMethod(createClient(), {
      loungeId: lounge.id,
      dateIso: draft.dateIso!,
      band: draft.band!,
      slotTime: draft.time!,
      specialRequests: draft.specialRequests,
      paymentMethodId: draft.paymentMethodId!,
    });

    if (result.status === "succeeded") return { ok: true, paymentId: result.paymentId };
    return {
      ok: false,
      message: result.error ?? "Your card was declined.",
      paymentId: result.paymentId,
    };
  }, [covered, lounge.id, draft.dateIso, draft.band, draft.time, draft.specialRequests, draft.paymentMethodId]);

  return <SummaryScreenBody chargePayment={chargePayment} />;
}

function SummaryScreenBody({
  chargePayment,
}: {
  chargePayment: () => Promise<PaymentOutcome>;
}) {
  const router = useRouter();
  const { lounge, draft, update, holdSecondsLeft, refreshCoverage } = useBooking();
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<{ message: string; reference: string } | null>(
    null,
  );

  const bookingRequest: BookingRequest = {
    loungeId: lounge.id,
    dateIso: draft.dateIso!,
    band: draft.band!,
    time: draft.time!,
    specialRequests: draft.specialRequests,
  };

  async function handleConfirm() {
    let outcome: PaymentOutcome;
    try {
      outcome = await chargePayment();
    } catch (error) {
      console.error("chargePayment failed", error);
      // AC "Error handling: network issues, ... system unavailability" — un
      // fallo inesperado (no un rechazo de tarjeta) se trata igual: nunca
      // se llega a `confirm_booking` sin saber si de verdad se cobró.
      outcome = {
        ok: false,
        message: "Something went wrong processing your payment.",
        paymentId: null,
      };
    }

    if (!outcome.ok) {
      const reference = outcome.paymentId
        ? bookingReferenceFromId(outcome.paymentId)
        : errorReference(lounge.id, draft.dateIso!, draft.time!);
      setPaymentError({ message: outcome.message, reference });
      return;
    }

    let booking: Awaited<ReturnType<typeof confirmBooking>>;
    try {
      booking = await confirmBooking(createClient(), bookingRequest, outcome.paymentId);
    } catch (error) {
      // Epic 9 — `confirm_booking` decide quién paga: si la visita dejó de
      // estar cubierta (p. ej. las visitas del mes se agotaron en otra
      // pestaña) la rechaza sin crear nada. Se reutiliza el estado de error
      // de pago y se vuelve a pedir la cobertura, para que el paso de pago
      // ofrezca ya las opciones de pago.
      console.error("confirmBooking failed", error);
      refreshCoverage();
      setPaymentError({
        message: "This visit is no longer covered by your membership — choose how to pay on the Payment step.",
        reference: errorReference(lounge.id, draft.dateIso!, draft.time!),
      });
      return;
    }

    if (!booking) {
      setWaitlistOpen(true);
      return;
    }

    update({ bookingId: booking.id, bookingStatus: booking.status });
    router.push(`/lounges/${lounge.id}/book/confirmed`);
  }

  async function handleJoinWaitlist() {
    const booking = await joinWaitlist(createClient(), bookingRequest);
    update({ bookingId: booking.id, bookingStatus: booking.status });
    setWaitlistOpen(false);
  }

  return (
    <AppShell padded={false} blurred={waitlistOpen || paymentError !== null}>
      <StepFlowRail
        lounge={lounge}
        backHref={`/lounges/${lounge.id}/book/payment`}
        backLabel="Back to payment"
        address={`${formatWeekdayDate(draft.dateIso!)} · ${draft.time} · Admission for one`}
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
        dateIso={draft.dateIso!}
        time={draft.time!}
        onChangeDate={() => {
          setWaitlistOpen(false);
          router.push(`/lounges/${lounge.id}/book`);
        }}
        onJoinWaitlist={handleJoinWaitlist}
      />

      <PaymentErrorModal
        open={paymentError !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentError(null);
        }}
        time={draft.time!}
        cardLabel={draft.paymentMethodId === NEW_CARD_OPTION_ID ? "new card" : "saved card"}
        message={paymentError?.message ?? ""}
        reference={paymentError?.reference ?? ""}
        secondsLeft={holdSecondsLeft}
        onTryAgain={() => setPaymentError(null)}
        onContactSupport={() => setPaymentError(null)}
      />
    </AppShell>
  );
}
