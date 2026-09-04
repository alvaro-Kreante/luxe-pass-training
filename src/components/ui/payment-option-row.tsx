import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 — Fila de opción / método de pago.
 * radius 14px, padding 14px 16px, radio 22px. "Sirve también para las
 * alternativas de una lista de decisión" — reutilizada por los métodos de
 * pago guardados y por las alternativas de Waitlist/PaymentError.
 */
export interface PaymentOptionRowProps {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * `role="radio"` sobre un `div`, no un `<button>`: `trailing` puede llevar un
 * enlace propio ("Remove"), y un control interactivo dentro de un `<button>`
 * es HTML inválido e inaccesible.
 */
export function PaymentOptionRow({
  selected,
  onSelect,
  title,
  subtitle,
  leading,
  trailing,
  disabled,
  className,
}: PaymentOptionRowProps) {
  function activate() {
    if (!disabled) onSelect();
  }

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors duration-150",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        selected
          ? "border-[1.5px] border-accent bg-surface shadow-ring"
          : "border-line bg-surface hover:border-accent",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
          selected ? "border-accent" : "border-line",
        )}
      >
        {selected ? <span className="size-[11px] rounded-full bg-accent" /> : null}
      </span>

      {leading}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold text-fg">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs text-fg-subtle">{subtitle}</span>
        ) : null}
      </span>

      {trailing}
    </div>
  );
}
