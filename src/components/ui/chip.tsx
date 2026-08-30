"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Chip seleccionable.
 * padding 8px 16px, radius 20px. Activo: fondo `--gold-500` + texto blanco.
 * Inactivo: borde 1px `--border` + texto `--ink-700`.
 */
export interface SelectableChipProps {
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectableChip({
  selected,
  onToggle,
  children,
  className,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "cursor-pointer rounded-pill px-4 py-2 text-[13px] font-semibold",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-ring",
        selected
          ? "bg-accent text-on-accent"
          : "border border-line text-fg-muted hover:border-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Variante "Other" del selector de intereses (ProfilePersonal.dc.html):
 * borde discontinuo y un "+" de 13px — invita a añadir, no selecciona.
 */
export function AddChip({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-pill border border-dashed border-line",
        "px-4 py-2 text-[13px] font-semibold text-fg-subtle transition-colors duration-150",
        "hover:border-accent hover:text-accent-strong focus-visible:outline-none focus-visible:shadow-ring",
        className,
      )}
      {...props}
    >
      <Plus size={13} strokeWidth={2} />
      {children}
    </button>
  );
}

/**
 * DESIGN-SYSTEM.md §4 — Chip removible.
 * padding 6px 8px 6px 14px, fondo `--gold-100`, con "×" de 13px.
 */
export interface RemovableChipProps {
  onRemove: () => void;
  /** Nombre de lo que se quita, para la etiqueta accesible del botón. */
  label: string;
  className?: string;
}

export function RemovableChip({
  onRemove,
  label,
  className,
}: RemovableChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[16px] bg-accent-soft py-1.5 pl-3.5 pr-2",
        "text-[12.5px] font-semibold text-fg-muted",
        className,
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="cursor-pointer text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:shadow-ring"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </span>
  );
}
