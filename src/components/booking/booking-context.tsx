"use client";

import * as React from "react";

import { SLOT_HOLD_SECONDS } from "@/lib/booking";
import type { WeekBandId } from "@/lib/lounge-profile";
import type { Lounge } from "@/lib/lounges";

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
};

interface BookingContextValue {
  lounge: Lounge;
  covered: boolean;
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  /** "Slot held for M:SS" (`Payment.dc.html`, `Summary.dc.html`) — cuenta
   * atrás única para todo el flujo, no por pantalla. */
  holdSecondsLeft: number;
}

const BookingContext = React.createContext<BookingContextValue | null>(null);

export function BookingProvider({
  lounge,
  covered,
  /** Solo para tests: arranca el borrador ya relleno para saltarse el paso 1. */
  initialDraft,
  children,
}: {
  lounge: Lounge;
  covered: boolean;
  initialDraft?: Partial<BookingDraft>;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = React.useState<BookingDraft>(() => ({
    ...EMPTY_BOOKING_DRAFT,
    ...initialDraft,
  }));
  const [holdSecondsLeft, setHoldSecondsLeft] = React.useState(SLOT_HOLD_SECONDS);

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
    () => ({ lounge, covered, draft, update, reset, holdSecondsLeft }),
    [lounge, covered, draft, update, reset, holdSecondsLeft],
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
