"use client";

import * as React from "react";

import { loadPartnerContext, selectPartnerLounge, type PartnerContext } from "@/lib/partner-lounges";
import { createClient } from "@/lib/supabase/client";

interface PartnerContextValue {
  context: PartnerContext | null;
  /** Lo guarda en la cuenta; `null` = "All lounges". */
  select: (loungeId: string | null) => Promise<void>;
}

const Context = React.createContext<PartnerContextValue | null>(null);

/**
 * Story 10.6 — el partner, el usuario y el lounge elegido, una sola vez para
 * todo /partner (lo monta `RequirePartnerSession`). Cambiar de lounge
 * actualiza la cuenta y todas las pantallas que lo leen.
 */
export function PartnerContextProvider({
  children,
  initialContext,
}: {
  children: React.ReactNode;
  /** PERF-02 — el contexto ya cargado en el servidor: no se vuelve a pedir. */
  initialContext?: PartnerContext | null;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [context, setContext] = React.useState<PartnerContext | null>(initialContext ?? null);
  const [loaded, setLoaded] = React.useState(initialContext !== undefined);

  React.useEffect(() => {
    if (initialContext !== undefined) return;
    let active = true;
    loadPartnerContext(supabase).then((next) => {
      if (!active) return;
      setContext(next);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [supabase, initialContext]);

  const select = React.useCallback(
    async (loungeId: string | null) => {
      setContext((current) =>
        current
          ? { ...current, allLounges: loungeId === null, selectedLoungeId: loungeId ?? current.selectedLoungeId }
          : current,
      );
      await selectPartnerLounge(supabase, loungeId);
    },
    [supabase],
  );

  const value = React.useMemo(() => ({ context, select }), [context, select]);
  if (!loaded) return null;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** null fuera de `PartnerContextProvider` (p. ej. las vistas previas de email). */
export function usePartnerContext(): PartnerContextValue | null {
  return React.useContext(Context);
}
