import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §3 — eyebrow 12px/700 uppercase letter-spacing .1em.
 * Por defecto en `--gold-600`; `muted` para las cabeceras de tabla y listas,
 * donde el dorado competiría con el eyebrow de sección (§4, tile de métrica claro).
 */
export function Eyebrow({
  className,
  muted,
  as: Tag = "p",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  muted?: boolean;
  as?: "p" | "span" | "div";
}) {
  return (
    <Tag
      className={cn(
        "text-xs font-bold uppercase tracking-[0.1em]",
        muted ? "text-fg-subtle" : "text-accent-strong",
        className,
      )}
      {...props}
    />
  );
}
