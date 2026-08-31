"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §5 patrón 5 — los dos segmented de la topbar de Explore:
 * el de unidades (38px, píldoras de 30px) y el de vista Map/List (50px,
 * píldoras de 42px con sombra en la activa).
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const compact = size === "sm";

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-1 bg-surface-sunken p-1",
        compact ? "h-[38px] rounded-nav" : "h-[50px] rounded-control",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex cursor-pointer items-center justify-center transition-colors duration-150",
              "focus-visible:outline-none focus-visible:shadow-ring",
              compact
                ? "h-[30px] gap-1.5 rounded-[7px] px-3 text-[12.5px]"
                : "h-[42px] gap-[7px] rounded-[9px] px-4 text-[13px]",
              selected
                ? "bg-surface font-bold text-fg"
                : "font-semibold text-fg-muted hover:text-fg",
              selected && !compact && "shadow-[0_4px_10px_-6px_rgb(34_26_20_/_0.35)]",
            )}
          >
            {Icon ? (
              <Icon
                size={16}
                strokeWidth={1.8}
                className={selected ? "text-accent-strong" : "text-fg-subtle"}
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
