"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { PartnerContextProvider } from "@/components/partner/partner-context";
import { hasDashboardAccess, loadPartnerContext } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";

/**
 * Epic 7 — toda pantalla bajo `/partner` (salvo `/partner/login`) exige
 * sesión de Supabase real y el rol `partner` (`has_role`, ver
 * `supabase/schemas/user_roles.sql`). Gemelo de `RequireSession`
 * (`components/onboarding/require-session.tsx`) para el lado de partner —
 * no lo reutiliza porque además del check de sesión valida el rol. Story
 * 10.6: monta además el contexto del partner. Story 10.1: un usuario de un
 * partner suspendido, o suspendido él mismo, sale con la sesión cerrada (partner, usuario y lounge
 * elegido) para todo /partner.
 */
export function RequirePartnerSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function check() {
      const { data } = await supabase.auth.getClaims();
      if (!data?.claims) {
        if (active) router.replace("/partner/login");
        return;
      }

      const { data: isPartner } = await supabase.rpc("has_role", { p_role: "partner" });
      if (!active) return;

      if (!isPartner) {
        router.replace("/partner/login");
        return;
      }

      // Story 10.1 — partner suspendido o usuario suspendido: fuera.
      const context = await loadPartnerContext(supabase);
      if (!active) return;
      if (!hasDashboardAccess(context)) {
        await supabase.auth.signOut();
        router.replace("/partner/login?suspended=1");
        return;
      }

      setAuthorized(true);
    }

    check();
    return () => {
      active = false;
    };
  }, [supabase, router]);

  if (!authorized) return null;
  return <PartnerContextProvider>{children}</PartnerContextProvider>;
}
