"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Epic 8 — toda pantalla bajo `/admin` (salvo `/admin/login`) exige sesión
 * de Supabase real y el rol `admin` (`has_role`, ver
 * `supabase/schemas/user_roles.sql`). Gemelo de `RequirePartnerSession`
 * (Epic 7) para el lado de admin.
 */
export function RequireAdminSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function check() {
      const { data } = await supabase.auth.getClaims();
      if (!data?.claims) {
        if (active) router.replace("/admin/login");
        return;
      }

      const { data: isAdmin } = await supabase.rpc("has_role", { p_role: "admin" });
      if (!active) return;

      if (!isAdmin) {
        router.replace("/admin/login");
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
  return <>{children}</>;
}
