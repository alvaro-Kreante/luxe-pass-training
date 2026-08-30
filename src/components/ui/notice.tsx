import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Aviso inline dentro de una card.
 *
 * DESIGN-SYSTEM.md §4 no define un banner, así que este componente se deriva de
 * piezas que sí están fijadas, sin inventar lenguaje nuevo:
 *
 * - Geometría de la "Fila de opción" (§4): radius 14px, padding 14px 16px,
 *   flex con gap 13px.
 * - **Borde discontinuo** para lo negativo o inactivo, que es como el sistema
 *   marca "cerrado", "no-show" y "cancelled" (§4, §5 Estados).
 * - **Sin colores semánticos**: §5 Estados es explícito — "no se introducen
 *   colores semánticos (verde/rojo) — la paleta cálida es el único sistema".
 *
 * `attention` toma prestado el tratamiento del bloque de contacto de emergencia
 * de la Fase 6: fondo hundido con `border: 1px dashed var(--gold-600)`.
 */
const noticeVariants = cva(
  "flex items-start gap-[13px] rounded-[14px] px-4 py-3.5 text-[12.5px] leading-[1.55]",
  {
    variants: {
      tone: {
        muted:
          "border border-dashed border-line bg-surface-sunken text-fg-subtle",
        attention:
          "border border-dashed border-accent-strong bg-surface-sunken text-fg-muted",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export interface NoticeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof noticeVariants> {
  /** Icono de 18px, stroke 1.6 (§1). */
  icon?: React.ReactNode;
}

export function Notice({
  className,
  tone,
  icon,
  children,
  ...props
}: NoticeProps) {
  return (
    <div
      role="status"
      className={cn(noticeVariants({ tone }), className)}
      {...props}
    >
      {icon ? (
        <span className="mt-px flex shrink-0 text-accent-strong">{icon}</span>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

export { noticeVariants };
