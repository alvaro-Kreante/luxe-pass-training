"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/**
 * Icono `LogOut` del bloque de usuario de los tres shells (patrones 3, 15 y
 * 21). Cierra la sesión de Supabase antes de ir al login correspondiente.
 * Los artboards de Partner y Admin dibujan un chevron: desviación anotada en
 * COMPONENT-MAP.md (ticket 002).
 */
export function LogoutButton({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace(redirectTo);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="Log out"
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-nav text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:cursor-default"
    >
      <LogOut size={17} strokeWidth={1.6} aria-hidden />
    </button>
  );
}
