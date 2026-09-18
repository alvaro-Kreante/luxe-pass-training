"use client";

import * as React from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";

import { BookingProvider } from "@/components/booking/booking-context";
import { StripeCheckoutBridge } from "@/components/booking/stripe-checkout-bridge";
import { RequireSession } from "@/components/onboarding/require-session";
import { AppShell } from "@/components/patterns/app-shell";
import { fetchLoungeProfile, type LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";

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
 *
 * Backend real (Epic 4): el lounge ya no sale de `LOUNGES` (catálogo mock) —
 * `fetchLoungeProfile` contra Supabase, mismo patrón que `/lounges/[id]` y
 * `/lounges/[id]/availability` (Epic 3).
 */
export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireSession>
      <BookLayoutContent>{children}</BookLayoutContent>
    </RequireSession>
  );
}

function BookLayoutContent({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [lounge, setLounge] = React.useState<LoungeProfile | null | undefined>(
    undefined,
  );
  const [covered] = React.useState(() => searchParams.get("covered") === "1");

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    fetchLoungeProfile(supabase, id).then((profile) => {
      if (active) setLounge(profile);
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (lounge === null) {
    notFound();
    return null;
  }

  if (!lounge) {
    return <AppShell padded={false}>{null}</AppShell>;
  }

  return (
    <BookingProvider lounge={lounge} covered={covered}>
      <StripeCheckoutBridge>{children}</StripeCheckoutBridge>
    </BookingProvider>
  );
}
