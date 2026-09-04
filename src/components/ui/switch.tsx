"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Switch de ajuste. Píldora de 44×26, `padding: 3px`,
 * manija de 20px. Activo: fondo `--gold-500`, manija a la derecha. Inactivo:
 * fondo `--border`, manija a la izquierda.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-[26px] w-11 shrink-0 cursor-pointer items-center rounded-pill p-[3px] transition-colors duration-150",
        checked ? "justify-end bg-accent" : "justify-start bg-line",
        className,
      )}
    >
      <span aria-hidden className="size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(34,26,20,0.28)]" />
    </button>
  );
}

/**
 * Cuando un canal no se puede desactivar, en su lugar va este chip
 * `--gold-100` de 11px que dice "Always" (§4).
 */
export function AlwaysOnChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-pill bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-fg",
        className,
      )}
    >
      Always
    </span>
  );
}
