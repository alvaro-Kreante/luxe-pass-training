import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Botón primario / secundario / outline de acento / "atrás".
 * Alto 52px, radius 12px, 13px/700 uppercase letter-spacing .12em.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-sans font-bold uppercase",
    "cursor-pointer transition-colors duration-150",
    "focus-visible:outline-none focus-visible:shadow-ring",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-strong",
        secondary:
          "bg-surface text-fg-muted border-[1.5px] border-line hover:border-accent disabled:hover:bg-surface",
        outline:
          "bg-transparent text-accent-strong border-[1.5px] border-accent hover:bg-accent-soft disabled:hover:bg-transparent",
        ghost:
          "bg-transparent text-fg-muted border-[1.5px] border-line hover:bg-surface-hover hover:border-accent disabled:hover:bg-transparent",
      },
      size: {
        lg: "h-[52px] px-6 text-[13px] tracking-[0.12em] rounded-control",
        md: "h-11 px-5 text-[12.5px] tracking-[0.06em] rounded-[11px]",
        square: "h-[52px] w-[52px] shrink-0 rounded-control",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "lg", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  block,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
