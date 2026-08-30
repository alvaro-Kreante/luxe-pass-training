import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Card / panel y Card de contenido.
 * panel:   radius 24px, sombra profunda, padding 44px (la card de un formulario)
 * content: radius 18px, sombra ligera, hover más marcado (una fila, un tile)
 */
const cardVariants = cva("bg-surface", {
  variants: {
    variant: {
      panel: "rounded-panel shadow-panel",
      content: "rounded-content shadow-content",
      flat: "rounded-content border border-line",
    },
    interactive: { true: "transition-shadow duration-150", false: "" },
    padded: { true: "", false: "" },
  },
  compoundVariants: [
    {
      variant: "content",
      interactive: true,
      class: "hover:shadow-content-hover",
    },
    { variant: "panel", padded: true, class: "p-11" },
    { variant: "content", padded: true, class: "p-5" },
    { variant: "flat", padded: true, class: "p-5" },
  ],
  defaultVariants: { variant: "panel", interactive: false, padded: true },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({
  className,
  variant,
  interactive,
  padded,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, interactive, padded }),
        className,
      )}
      {...props}
    />
  );
}

export { cardVariants };
