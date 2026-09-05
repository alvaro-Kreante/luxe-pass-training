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
  /**
   * Story 6.1 (Fase 7) — "In progress" en `Main.dc.html`: fondo blanco, borde
   * dorado de 1.5px y el punto con el halo `box-shadow` en vez del fondo
   * `--gold-100` plano de "Confirmed". El chip de estado de reserva declarado
   * en COMPONENT-MAP ("un StatusChip con mapa de estados por dominio") es
   * este mismo componente con esta tercera variante.
   */
  emphasis = false,
  /** "Cancelled" en `History.dc.html` no lleva el punto delante del texto. */
  dot = true,
  /**
   * Fijado en la Fase 2 — "Arrived" del chip de asistencia (oscuro) añade un
   * borde `--gold-500` de 1px al fondo `bg-accent-soft` que "Confirmed" (claro)
   * no lleva. Misma geometría, un borde más.
   */
  outlined = false,
  className,
}: {
  children: React.ReactNode;
  available?: boolean;
  /** 11px en el callout del mapa, 11.5px en la card de resultado. */
  size?: "sm" | "md";
  dashed?: boolean;
  emphasis?: boolean;
  dot?: boolean;
  outlined?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pill font-bold",
        size === "sm" ? "px-2.5 py-[3px] text-[11px]" : "px-2.5 py-1 text-[11.5px]",
        emphasis
          ? "border-[1.5px] border-accent bg-surface text-fg"
          : available
            ? cn("bg-accent-soft text-fg", outlined && "border border-accent")
            : dashed
              ? "border border-dashed border-fg-subtle text-fg-subtle"
              : "border border-line text-fg-subtle",
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            emphasis
              ? "bg-accent shadow-[0_0_0_3px_rgba(201,168,118,0.28)]"
              : available
                ? "bg-accent"
                : "bg-fg-subtle",
          )}
        />
      )}
      {children}
    </span>
  );
}
