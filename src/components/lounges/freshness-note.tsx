"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Story 3.2 — "Last updated timestamp" + "Automatic refresh every 5
 * minutes". No hay red que consultar, así que el refresco es un contador
 * local: sube de minuto en minuto y vuelve a "just now" al llegar a 5,
 * simulando el disparador que en producción vendría del servidor.
 */
const REFRESH_EVERY_MINUTES = 5;

export function FreshnessNote({ className }: { className?: string }) {
  const [minutesAgo, setMinutesAgo] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setMinutesAgo((minutes) => (minutes + 1) % REFRESH_EVERY_MINUTES);
    }, 60_000);

    return () => clearInterval(id);
  }, []);

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
