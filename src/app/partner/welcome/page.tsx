"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InviteExpiredCard } from "@/components/partner/invite-expired-card";
import { PartnerWelcomeForm } from "@/components/partner/partner-welcome-form";
import { PartnerAuthSplit } from "@/components/patterns/partner-auth-split";
import { Spinner } from "@/components/ui/spinner";
import { acceptPartnerInvite, completePartnerInvite, type PartnerWelcome } from "@/lib/partner-invite";
import { createClient } from "@/lib/supabase/client";

/**
 * Epic 7 · SetPassword.dc.html (14) e InviteExpired.dc.html (15) — el enlace
 * del email de invitación (`admin-publish-lounge`). Pública a propósito: no
 * va envuelta en `RequirePartnerSession`, la sesión nace al verificar el token.
 */
export default function PartnerWelcomePage() {
  return (
    <React.Suspense fallback={null}>
      <PartnerWelcomeScreen />
    </React.Suspense>
  );
}

type WelcomeState = { status: "checking" } | { status: "expired" } | { status: "ready"; welcome: PartnerWelcome };

function PartnerWelcomeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = React.useMemo(() => createClient(), []);
  const tokenHash = params.get("token_hash");
  const hasInviteToken = Boolean(tokenHash) && params.get("type") === "invite";
  const [state, setState] = React.useState<WelcomeState>({ status: "checking" });
  // El token es de un solo uso: el doble efecto de StrictMode lo gastaría.
  const verified = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!hasInviteToken || !tokenHash || verified.current === tokenHash) return;
    verified.current = tokenHash;
    acceptPartnerInvite(supabase, tokenHash).then((welcome) =>
      setState(welcome ? { status: "ready", welcome } : { status: "expired" }),
    );
  }, [hasInviteToken, supabase, tokenHash]);

  if (!hasInviteToken || state.status === "expired") {
    return (
      <PartnerAuthSplit
        headline="A fresh link is one message away."
        body="Invitations are kept short on purpose — a door left open is a door anyone can walk through."
        footer="Partner accounts are issued by En Soleil"
      >
        <InviteExpiredCard />
      </PartnerAuthSplit>
    );
  }

  return (
    <PartnerAuthSplit
      headline="Your venue, ready when you are."
      body="One password and the lounge is yours to run — tomorrow's arrivals, today's check-ins and every booking as it lands."
      footer="Invited by En Soleil"
    >
      {state.status === "ready" ? (
        <PartnerWelcomeForm
          welcome={state.welcome}
          onSubmit={async (input) => {
            await completePartnerInvite(supabase, input);
            router.push("/partner");
          }}
        />
      ) : (
        <Spinner />
      )}
    </PartnerAuthSplit>
  );
}
