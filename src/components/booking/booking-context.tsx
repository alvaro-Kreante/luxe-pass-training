"use client";

import * as React from "react";
import type { StripeUseCheckoutElementsResult } from "@stripe/react-stripe-js/checkout";

import { today } from "@/lib/availability";
import {
  MEMBERSHIP_COVERAGE_FIXTURE,
  NOT_COVERED,
  SLOT_HOLD_SECONDS,
  fetchBookingCoverage,
  type BookingCoverage,
} from "@/lib/booking";
import type { LoungeProfile, WeekBandId } from "@/lib/lounge-profile";
import { createCheckoutSession } from "@/lib/stripe-payments";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 4.1 / 4.2 — el borrador de reserva vive por encima de los tres pasos
 * (`/book`, `/book/payment`, `/book/summary`): el layout de la ruta no se
 * remonta al navegar entre ellos, así que "atrás" conserva la selección.
 *
 * `lounge` es fijo para todo el flujo; `draft` cambia paso a paso. Sin
 * persistencia: recargar empieza de cero.
 *
 * Epic 9 — `coverage` (quién paga: day pass de regalo, visita incluida de la
 * membresía, o day pass pagado) lo decide el servidor (`booking_coverage`)
 * para el mes de la fecha elegida, con la misma regla que luego aplica
 * `confirm_booking`. Se recalcula al cambiar la fecha y se congela en cuanto
 * la reserva existe (si no, la propia reserva recién hecha contaría como
 * visita usada y `/book/confirmed` diría que se pagó). `covered` es el
 * atajo booleano que ya usaban las pantallas.
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
  /** `null` mientras el servidor no ha respondido. */
  coverage: BookingCoverage | null;
  covered: boolean;
  /** Vuelve a preguntar al servidor — p. ej. si `confirm_booking` rechazó una visita que parecía cubierta. */
  refreshCoverage: () => void;
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  /** "Slot held for M:SS" (`Payment.dc.html`, `Summary.dc.html`) — cuenta
   * atrás única para todo el flujo, no por pantalla. */
  holdSecondsLeft: number;
  /** `null` hasta que el miembro elige "Use a new card" — el
   * `<CheckoutElementsProvider>` de `BookLayout` solo se monta si esto
   * tiene valor (ver `stripe-checkout-bridge.tsx`). */
  checkoutSession: CheckoutSessionState | null;
  /** La Edge Function falló al crear la sesión: el paso 2 lo dice en vez de quedarse cargando. */
  checkoutSessionFailed: boolean;
  /**
   * Pide la Checkout Session del borrador actual. Idempotente (ticket 001):
   * una sola sesión por visita elegida y por opción de "Save this card",
   * aunque el paso 2 se remonte o StrictMode duplique el efecto — una
   * segunda sesión dejaba una fila `payments` huérfana y la reserva ligada a
   * un pago que Stripe no cobraba. Cambiar "Save this card" sí abre otra:
   * `setup_future_usage` se fija al crearla, y el `checkout.confirm({
   * savePaymentMethod })` que lo evitaría obliga a Stripe a pintar su propio
   * checkbox de guardado, duplicado con el del artboard.
   */
  requestCheckoutSession: () => void;
  /** Lo último que devolvió `useCheckoutElements()` dentro del provider del
   * bridge, para que `/book/summary` confirme sin colgar de ese provider. Es
   * un ref y no estado: Stripe devuelve un objeto nuevo en cada render y
   * guardarlo en estado entraba en bucle; solo se lee al confirmar. */
  checkoutElementsRef: React.RefObject<StripeUseCheckoutElementsResult | null>;
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
  covered: coveredFixture,
  /** Solo para tests: arranca el borrador ya relleno para saltarse el paso 1. */
  initialDraft,
  children,
}: {
  lounge: LoungeProfile;
  /**
   * Solo para tests de componente: fija la cobertura (visita incluida con
   * las cifras de `MembershipCovered.dc.html`, o day pass pagado) sin
   * preguntar al servidor — mismo criterio que la fixture `AINSWORTH_PASS`.
   * `BookLayout` nunca la pasa: en la app la decide `booking_coverage`.
   */
  covered?: boolean | BookingCoverage;
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
  const [checkoutSessionFailed, setCheckoutSessionFailed] = React.useState(false);
  const checkoutElementsRef = React.useRef<StripeUseCheckoutElementsResult | null>(null);
  const checkoutSessionKey = React.useRef<string | null>(null);
  const [paymentElementHost, setPaymentElementHost] = React.useState<HTMLDivElement | null>(
    null,
  );
  const [paymentElementHeight, setPaymentElementHeight] = React.useState<number | null>(
    null,
  );

  const [liveCoverage, setLiveCoverage] = React.useState<BookingCoverage | null>(null);
  const [coverageRequest, setCoverageRequest] = React.useState(0);
  const refreshCoverage = React.useCallback(() => setCoverageRequest((count) => count + 1), []);
  const coverageDate = draft.dateIso ?? today();
  const bookingExists = draft.bookingId !== null;

  React.useEffect(() => {
    if (coveredFixture !== undefined || bookingExists) return;
    let active = true;
    fetchBookingCoverage(createClient(), coverageDate)
      .then((next) => {
        if (active) setLiveCoverage(next);
      })
      .catch(() => {
        if (active) setLiveCoverage(NOT_COVERED);
      });
    return () => {
      active = false;
    };
  }, [coveredFixture, coverageDate, bookingExists, coverageRequest]);

  const coverage =
    coveredFixture === undefined
      ? liveCoverage
      : typeof coveredFixture === "object"
        ? coveredFixture
        : coveredFixture
          ? MEMBERSHIP_COVERAGE_FIXTURE
          : NOT_COVERED;
  const covered = coverage !== null && coverage.kind !== "none";

  const update = React.useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = React.useCallback(() => setDraft(EMPTY_BOOKING_DRAFT), []);

  const requestCheckoutSession = React.useCallback(() => {
    const { dateIso, band, time, specialRequests, saveNewCard } = draft;
    if (!dateIso || !band || !time) return;

    const key = [lounge.id, dateIso, band, time, specialRequests, saveNewCard].join("|");
    if (checkoutSessionKey.current === key) return;
    checkoutSessionKey.current = key;
    setCheckoutSession(null);
    setCheckoutSessionFailed(false);

    createCheckoutSession(createClient(), {
      loungeId: lounge.id,
      dateIso,
      band,
      slotTime: time,
      specialRequests,
      saveCard: saveNewCard,
    })
      .then((session) => {
        if (checkoutSessionKey.current === key) setCheckoutSession(session);
      })
      .catch((error) => {
        console.error("createCheckoutSession failed", error);
        if (checkoutSessionKey.current !== key) return;
        checkoutSessionKey.current = null;
        setCheckoutSessionFailed(true);
      });
  }, [draft, lounge.id]);

  React.useEffect(() => {
    const id = setInterval(() => {
      setHoldSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const value = React.useMemo(
    () => ({
      lounge,
      coverage,
      covered,
      refreshCoverage,
      draft,
      update,
      reset,
      holdSecondsLeft,
      checkoutSession,
      checkoutSessionFailed,
      requestCheckoutSession,
      checkoutElementsRef,
      paymentElementHost,
      setPaymentElementHost,
      paymentElementHeight,
      setPaymentElementHeight,
    }),
    [
      lounge,
      coverage,
      covered,
      refreshCoverage,
      draft,
      update,
      reset,
      holdSecondsLeft,
      checkoutSession,
      checkoutSessionFailed,
      requestCheckoutSession,
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
