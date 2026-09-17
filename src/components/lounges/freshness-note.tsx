"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Story 3.2 — "Last updated timestamp" + "Automatic refresh every 5
 * minutes". `lastUpdatedAt` es el instante real en que la página trajo la
 * disponibilidad de Supabase (ver `/lounges/[id]` y `/lounges/[id]/availability`,
 * que refetchean cada 5 min) — este componente solo recalcula el texto
 * "hace N min" cada 15s para que no se quede fijo entre refrescos.
 */
export const REFRESH_EVERY_MINUTES = 5;

export function FreshnessNote({
  lastUpdatedAt,
  className,
}: {
  lastUpdatedAt: string;
  className?: string;
}) {
  /** `Date.now()` es impuro: se calcula en el efecto (fase de commit), nunca
   * durante el render. */
  const [minutesAgo, setMinutesAgo] = React.useState(0);

  React.useEffect(() => {
    function tick() {
      setMinutesAgo(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(lastUpdatedAt).getTime()) / 60_000),
        ),
      );
    }

    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  return (
    <span
      className={cn(
        "flex items-center gap-2 text-[11.5px] text-fg-subtle",
        className,
      )}
    >
      <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
      Updated {minutesAgo === 0 ? "just now" : `${minutesAgo} min ago`} ·
      refreshes every {REFRESH_EVERY_MINUTES} min
    </span>
  );
}
