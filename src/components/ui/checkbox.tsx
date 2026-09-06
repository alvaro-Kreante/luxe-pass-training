"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Checkbox 18×18, radius 5px.
 * Vacío: borde 1.5px `--border`. Marcado: fondo `--gold-500` + check blanco stroke 2.4.
 */
export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Contenido del label; admite enlaces inline. */
  children?: React.ReactNode;
  /**
   * `start` para textos de varias líneas (aceptación de términos);
   * `center` para etiquetas de una línea (Remember me).
   */
  align?: "start" | "center";
  id?: string;
  className?: string;
  /** Nombre accesible cuando la casilla no lleva `children` visible junto a ella. */
  "aria-label"?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  children,
  align = "start",
  id,
  className,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer gap-2.5",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex h-[18px] w-[18px] min-w-[18px] items-center justify-center rounded-[5px]",
          align === "start" && "mt-px",
          "transition-colors duration-150 peer-focus-visible:shadow-ring",
          checked
            ? "bg-accent text-on-accent"
            : "border-[1.5px] border-line bg-surface group-hover:border-accent",
        )}
      >
        {checked ? <Check size={12} strokeWidth={2.4} /> : null}
      </span>
      {children ? (
        <span
          className={cn(
            "text-[13px] text-fg-muted",
            align === "start" && "leading-normal",
          )}
        >
          {children}
        </span>
      ) : null}
    </label>
  );
}
