import * as React from "react";
import { ChevronDown } from "lucide-react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { controlVariants } from "./input";

/**
 * DESIGN-SYSTEM.md §4 — Select nativo con la misma geometría que el input
 * y el chevron de 16px a la derecha (ver ProfileProfessional.dc.html).
 */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof controlVariants> {
  icon?: React.ReactNode;
}

export function Select({
  className,
  inputSize,
  icon,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-4 top-1/2 z-1 flex -translate-y-1/2 text-fg-subtle">
          {icon}
        </span>
      ) : null}
      <select
        className={cn(
          controlVariants({ inputSize }),
          "cursor-pointer appearance-none pr-[46px]",
          icon ? "pl-[46px]" : "pl-4",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 text-fg-subtle">
        <ChevronDown size={16} strokeWidth={1.8} />
      </span>
    </div>
  );
}
