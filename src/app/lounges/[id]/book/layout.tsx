"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";

import { BookingProvider } from "@/components/booking/booking-context";
import { StripeCheckoutBridge } from "@/components/booking/stripe-checkout-bridge";
import { RequireSession } from "@/components/onboarding/require-session";
import { AppShell } from "@/components/patterns/app-shell";
import { fetchLoungeProfile, type LoungeProfile } from "@/lib/lounge-profile";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 4.1/4.2 — el borrador de reserva es compartido por los tres pasos
 * (`/book`, `/book/payment`, `/book/summary`) y por `/book/confirmed`, que lo
 * lee para pintar la confirmación. La variante "MembershipCovered.dc.html"
 * ya no se alcanza con `?covered=1`: desde Epic 9 la decide el servidor
 * según el plan real del miembro (ver `BookingProvider`).
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
  const [lounge, setLounge] = React.useState<LoungeProfile | null | undefined>(
    undefined,
  );

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
    <BookingProvider lounge={lounge}>
      <StripeCheckoutBridge>{children}</StripeCheckoutBridge>
    </BookingProvider>
  );
}
