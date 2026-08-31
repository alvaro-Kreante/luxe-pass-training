import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 "Estados" — carga.
 * Misma geometría que la pieza real; el degradado y el shimmer los pone la
 * utilidad `.skeleton` de `globals.css`.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className)} />;
}
