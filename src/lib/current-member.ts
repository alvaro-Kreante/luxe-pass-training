"use client";

import * as React from "react";

import { SAMPLE_MEMBER } from "./member";
import { createClient } from "./supabase/client";

export interface ShellMember {
  name: string;
  initials: string;
  tier: string;
  email: string;
}

export function initialsFor(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "LP"
  );
}

/**
 * Miembro con sesión para el bloque de usuario del App shell, el saludo del
 * Home y el nombre/email de las pantallas de reserva y referidos. El plan (anual/mensual) sigue sin modelarse en `profiles` — solo
 * `membership_status` es real —, así que el tier dice "Active/Free
 * member" en vez de inventar un plan. Sin sesión (o sin perfil todavía) se
 * queda en `SAMPLE_MEMBER`, como el mockup.
 */
export function useCurrentMember(): ShellMember {
  const [member, setMember] = React.useState<ShellMember>(SAMPLE_MEMBER);

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const email = user.email ?? SAMPLE_MEMBER.email;
      setMember((current) => ({ ...current, email }));

      const { data } = await supabase
        .from("profiles")
        .select("full_name, membership_status")
        .eq("id", user.id)
        .maybeSingle();
      if (!data || cancelled) return;

      setMember({
        name: data.full_name,
        initials: initialsFor(data.full_name),
        tier: data.membership_status === "inactive" ? "Free member" : "Active member",
        email,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return member;
}
