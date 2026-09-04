"use client";

import * as React from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";

import { BookingProvider } from "@/components/booking/booking-context";
import { LOUNGES } from "@/lib/lounges";

/**
 * Story 4.1/4.2 — el borrador de reserva es compartido por los tres pasos
 * (`/book`, `/book/payment`, `/book/summary`) y por `/book/confirmed`, que lo
 * lee para pintar la confirmación. `?covered=1` alcanza la variante
 * "MembershipCovered.dc.html" sin backend real de membresía, igual que los
 * query params de `/explore`.
 *
 * `covered` se fija solo en el primer render de este layout, no en cada uno:
 * los enlaces internos del flujo (`/book` → `/book/payment` → `/book/summary`)
 * no repiten el query string, y si se releyera en cada navegación la variante
 * "cubierto por membresía" se perdería a mitad de flujo.
 */
export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const lounge = LOUNGES.find((candidate) => candidate.id === id);
  const [covered] = React.useState(() => searchParams.get("covered") === "1");

  if (!lounge) {
    notFound();
    return null;
  }

  return (
    <BookingProvider lounge={lounge} covered={covered}>
      {children}
    </BookingProvider>
  );
}
