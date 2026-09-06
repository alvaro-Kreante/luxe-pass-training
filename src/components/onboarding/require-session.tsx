"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Story 1.1 — el flujo de perfil (/onboarding/*) exige una sesión ya
 * confirmada (viene de /auth/confirm). Sin ella, la fila de `profiles`
 * no tendría a quién atribuirse (RLS exige `auth.uid()`).
 */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [hasSession, setHasSession] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getClaims().then(({ data }) => {
      if (!active) return;
      if (!data?.claims) {
        router.replace("/login");
        return;
      }
      setHasSession(true);
    });
    return () => {
      active = false;
    };
  }, [supabase, router]);

  if (!hasSession) return null;
  return <>{children}</>;
}
