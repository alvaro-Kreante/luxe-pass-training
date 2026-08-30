import * as React from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

/**
 * DESIGN-SYSTEM.md §4 — Progress de pasos.
 * N barras flex:1 de 4px, radius 2px; completadas `--gold-500`, pendientes `--border`.
 * Encima, el eyebrow "Step N of M · Nombre".
 */
export interface StepProgressProps {
  current: number;
  total: number;
  label: string;
  className?: string;
}

export function StepProgress({
  current,
  total,
  label,
  className,
}: StepProgressProps) {
  return (
    <div className={cn("mb-1.5", className)}>
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-[2px]",
              i < current ? "bg-accent" : "bg-line",
            )}
          />
        ))}
      </div>
      <Eyebrow>
        Step {current} of {total} · {label}
      </Eyebrow>
    </div>
  );
}
