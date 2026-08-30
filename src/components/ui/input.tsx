import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Input / select.
 * Alto 50px (44px en la variante compacta oscura de la Fase 2), radius 12px,
 * padding izq. 46px cuando lleva icono, focus: borde dorado + halo.
 */
const controlVariants = cva(
  [
    "w-full rounded-control border border-line bg-surface font-sans text-fg",
    "placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150",
    "focus:border-accent focus:shadow-ring focus:outline-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      inputSize: {
        default: "h-[50px] text-sm",
        compact: "h-11 rounded-[11px] text-[13.5px]",
      },
    },
    defaultVariants: { inputSize: "default" },
  },
);

type Adornment = React.ReactNode;

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof controlVariants> {
  /** Icono a la izquierda: 18px a 16px del borde (§4). */
  icon?: Adornment;
  /** Acción a la derecha — p. ej. el ojo de "mostrar contraseña". */
  trailing?: Adornment;
}

export function Input({
  className,
  inputSize,
  icon,
  trailing,
  ...props
}: InputProps) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 text-fg-subtle">
          {icon}
        </span>
      ) : null}
      <input
        className={cn(
          controlVariants({ inputSize }),
          icon ? "pl-[46px]" : "pl-4",
          trailing ? "pr-[46px]" : "pr-4",
          className,
        )}
        {...props}
      />
      {trailing ? (
        <span className="absolute right-4 top-1/2 flex -translate-y-1/2 text-fg-subtle">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

export { controlVariants };
