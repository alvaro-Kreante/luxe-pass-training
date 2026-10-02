"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.1 — el flujo de perfil (/onboarding/*) exige una sesión ya
 * confirmada (viene de /auth/confirm). Sin ella, la fila de `profiles`
 * no tendría a quién atribuirse (RLS exige `auth.uid()`).
 *
 * Con `requireProfile`, además exige el onboarding terminado (la fila de
 * `profiles` nace en su último paso): sin ella, manda a completarlo
 * (flow-onboarding.md: EmailVerified → ProfileCreation).
 */
export function RequireSession({
  children,
  requireProfile = false,
}: {
  children: React.ReactNode;
  requireProfile?: boolean;
}) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getClaims();
      if (!active) return;
      if (!data?.claims) {
        router.replace("/login");
        return;
      }
      if (requireProfile) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.claims.sub)
          .maybeSingle();
        if (!active) return;
        if (!profile) {
          router.replace("/onboarding/basics");
          return;
        }
      }
      setAllowed(true);
    })();
    return () => {
      active = false;
    };
  }, [supabase, router, requireProfile]);

  if (!allowed) return null;
  return <>{children}</>;
}
