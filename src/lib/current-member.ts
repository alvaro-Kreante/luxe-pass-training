"use client";

import * as React from "react";

import { SAMPLE_MEMBER } from "./member";
import { fetchMembership, initialsOf, type MemberMembership } from "./membership";
import { createClient } from "./supabase/client";

export interface ShellMember {
  name: string;
  initials: string;
  tier: string;
  email: string;
}

/** Sin plan activo no se muestra "Inactive": suena a cuenta suspendida. */
export function tierFor(membership: MemberMembership): string {
  if (membership.status !== "active") return "Free member";
  return membership.plan === "monthly" ? "Monthly member" : "Annual member";
}

/**
 * Miembro con sesión para el bloque de usuario del App shell, el saludo del
 * Home y el nombre/email de las pantallas de reserva. El tier sale de
 * `memberships` (Epic 9). Sin sesión (o sin perfil todavía) se queda en
 * `SAMPLE_MEMBER`, como el mockup.
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

      const [{ data }, membership] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        fetchMembership(supabase),
      ]);
      if (!data || cancelled) return;

      setMember({
        name: data.full_name,
        initials: initialsOf(data.full_name),
        tier: tierFor(membership),
        email,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return member;
}
