import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Marca de tarjeta.
 * Rectángulo 44×30, radius 7px, texto 10.5px/800.
 */
const BRAND_LABEL: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

/** Story 4.2 — marcas reales de Stripe (`payment_method.card.brand`), no solo las dos del mock. */
export function CardBrandBadge({
  brand,
  className,
}: {
  brand: string;
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
      {BRAND_LABEL[brand] ?? brand.slice(0, 4).toUpperCase()}
    </span>
  );
}
