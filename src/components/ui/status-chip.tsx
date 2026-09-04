import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 "Estados" — disponibilidad.
 * Disponible: fondo `--gold-100` con punto `--gold-500`.
 * No disponible: borde `--border` con punto y texto en `--ink-400`.
 * La paleta cálida es el único sistema: no se introducen verde ni rojo.
 */
export function StatusChip({
  children,
  available = true,
  size = "md",
  /**
   * Story 5.2 (Fase 6) — el chip de No-show / Waitlisted del pase digital usa
   * un borde discontinuo en vez del sólido de "not available". Misma
   * geometría, variante nueva en vez de un componente aparte.
   */
  dashed = false,
  className,
}: {
  children: React.ReactNode;
  available?: boolean;
  /** 11px en el callout del mapa, 11.5px en la card de resultado. */
  size?: "sm" | "md";
  dashed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill font-bold",
        size === "sm" ? "px-2.5 py-[3px] text-[11px]" : "px-2.5 py-1 text-[11.5px]",
        available
          ? "bg-accent-soft text-fg"
          : dashed
            ? "border border-dashed border-fg-subtle text-fg-subtle"
            : "border border-line text-fg-subtle",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          available ? "bg-accent" : "bg-fg-subtle",
        )}
      />
      {children}
    </span>
  );
}
