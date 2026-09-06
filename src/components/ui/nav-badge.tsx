import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Badge de nav (oscuro)" — fijado en la Fase 8. Píldora
 * de 20px al final de un item de la sidebar con el recuento pendiente.
 */
export function NavBadge({ count, active = false }: { count: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded-pill px-1.5 text-[11px] font-extrabold",
        active
          ? "bg-accent text-panel-black"
          : "border border-gold-600 bg-[rgba(201,168,118,0.18)] text-fg-muted",
      )}
    >
      {count}
    </span>
  );
}
