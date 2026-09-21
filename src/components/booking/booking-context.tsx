"use client";

import * as React from "react";

import { SLOT_HOLD_SECONDS } from "@/lib/booking";
import type { LoungeProfile, WeekBandId } from "@/lib/lounge-profile";

/**
 * Story 4.1 / 4.2 — el borrador de reserva vive por encima de los tres pasos
 * (`/book`, `/book/payment`, `/book/summary`): el layout de la ruta no se
 * remonta al navegar entre ellos, así que "atrás" conserva la selección.
 *
 * `lounge` y `covered` (visita cubierta por la membresía, `?covered=1`) son
 * fijos para todo el flujo; solo `draft` cambia paso a paso. Sin
 * persistencia: recargar empieza de cero, como el resto del mockup.
 */
export interface BookingDraft {
  dateIso: string | null;
  time: string | null;
  band: WeekBandId | null;
  seatsLeft: number | null;
  specialRequests: string;
  paymentMethodId: string | null;
  saveNewCard: boolean;
  acceptedTerms: boolean;
  /** Id real de `bookings`, asignado por `confirm_booking`/`join_waitlist`
   * (Supabase) tras el chequeo final de disponibilidad. */
  bookingId: string | null;
  bookingStatus: "confirmed" | "waitlisted" | null;
}

export const EMPTY_BOOKING_DRAFT: BookingDraft = {
  dateIso: null,
  time: null,
  band: null,
  seatsLeft: null,
  specialRequests: "",
  paymentMethodId: null,
  saveNewCard: false,
  acceptedTerms: false,
  bookingId: null,
  bookingStatus: null,
};

/** AC "Support for major credit/debit cards" — sesión de Checkout real, solo cuando el miembro elige "Use a new card". */
export interface CheckoutSessionState {
  clientSecret: string;
  paymentId: string;
}

interface BookingContextValue {
  lounge: LoungeProfile;
  covered: boolean;
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  /** "Slot held for M:SS" (`Payment.dc.html`, `Summary.dc.html`) — cuenta
   * atrás única para todo el flujo, no por pantalla. */
  holdSecondsLeft: number;
  /** `null` salvo cuando `draft.paymentMethodId === NEW_CARD_OPTION_ID` —
   * el `<CheckoutElementsProvider>` de `BookLayout` solo se monta si esto
   * tiene valor (ver `stripe-checkout-bridge.tsx`). */
  checkoutSession: CheckoutSessionState | null;
  setCheckoutSession: (session: CheckoutSessionState | null) => void;
  /**
   * Dónde debe pintarse (por portal) el `<PaymentElement>` real, ver
   * `stripe-checkout-bridge.tsx`. `stripe.confirm()` exige que el elemento
   * siga montado — si viviera solo en `/book/payment` (paso 2),
   * desmontarlo al navegar a `/book/summary` (paso 3, donde de verdad se
   * confirma el pago) rompe la confirmación con
   * "Please ensure that the Payment Element is mounted...". El bridge
   * porta el mismo `<PaymentElement>` a esta ref cuando el paso 2 lo pide,
   * y a un contenedor oculto propio en cualquier otro paso — nunca se
   * desmonta de verdad.
   */
  paymentElementHost: HTMLDivElement | null;
  setPaymentElementHost: (host: HTMLDivElement | null) => void;
  /**
   * Alto real y medido del `<PaymentElement>` (crece cuando se abre la
   * pestaña "Card": número, caducidad, CVC, país, ZIP). `stripe-checkout-
   * bridge.tsx` lo mide con un `ResizeObserver`; `payment-method-form.tsx`
   * lo aplica como `min-height` de su hueco reservado, para que el layout
   * normal empuje lo que va debajo (el checkbox "Save this card") en vez de
   * quedar tapado por el `position: fixed` del bridge.
   */
  paymentElementHeight: number | null;
  setPaymentElementHeight: (height: number | null) => void;
}

const BookingContext = React.createContext<BookingContextValue | null>(null);

export function BookingProvider({
  lounge,
  covered,
  /** Solo para tests: arranca el borrador ya relleno para saltarse el paso 1. */
  initialDraft,
  children,
}: {
  lounge: LoungeProfile;
  covered: boolean;
  initialDraft?: Partial<BookingDraft>;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = React.useState<BookingDraft>(() => ({
    ...EMPTY_BOOKING_DRAFT,
    ...initialDraft,
  }));
  const [holdSecondsLeft, setHoldSecondsLeft] = React.useState(SLOT_HOLD_SECONDS);
  const [checkoutSession, setCheckoutSession] = React.useState<CheckoutSessionState | null>(
    null,
  );
  const [paymentElementHost, setPaymentElementHost] = React.useState<HTMLDivElement | null>(
    null,
  );
  const [paymentElementHeight, setPaymentElementHeight] = React.useState<number | null>(
    null,
  );

  const update = React.useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => setDraft(EMPTY_BOOKING_DRAFT), []);

  React.useEffect(() => {
    const id = setInterval(() => {
      setHoldSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const value = React.useMemo(
    () => ({
      lounge,
      covered,
      draft,
      update,
      reset,
      holdSecondsLeft,
      checkoutSession,
      setCheckoutSession,
      paymentElementHost,
      setPaymentElementHost,
      paymentElementHeight,
      setPaymentElementHeight,
    }),
    [
      lounge,
      covered,
      draft,
      update,
      reset,
      holdSecondsLeft,
      checkoutSession,
      paymentElementHost,
      paymentElementHeight,
    ],
  );

  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const context = React.useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used inside <BookingProvider>");
  }
  return context;
}
