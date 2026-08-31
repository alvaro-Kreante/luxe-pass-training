import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — valoración: estrella dorada rellena + cifra en 12.5px/600.
 * Aparece en la card del Home, en la lista de resultados y en el callout del mapa.
 */
export function Rating({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12.5px] font-semibold text-fg-muted",
        className,
      )}
    >
      <Star size={13} className="fill-gold-500 text-gold-500" />
      {value.toFixed(1)}
    </span>
  );
}
