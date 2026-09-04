import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Marca de tarjeta.
 * Rectángulo 44×30, radius 7px, texto 10.5px/800.
 */
const BRAND_LABEL = {
  visa: "VISA",
  mastercard: "MC",
} as const;

export function CardBrandBadge({
  brand,
  className,
}: {
  brand: keyof typeof BRAND_LABEL;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-[30px] w-11 shrink-0 items-center justify-center rounded-[7px]",
        "bg-accent-soft text-[10.5px] font-extrabold tracking-[0.06em] text-fg",
        className,
      )}
    >
      {BRAND_LABEL[brand]}
    </span>
  );
}
