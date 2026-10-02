"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StatusOption {
  value: string;
  label: string;
  /** Una línea de qué pasa al elegirla, o por qué no se puede. */
  detail?: string;
  disabled?: boolean;
}

/**
 * Ajuste del 2 oct 2026 — el status de un lounge o de un partner se cambia
 * desde un solo selector en la cabecera, en vez de botones sueltos. Elegir
 * una opción no cambia nada por sí sola: la pantalla decide (confirmación,
 * publicar, activar…) con `onSelect`. Las reglas son las de siempre; las
 * opciones que no aplican salen deshabilitadas con su motivo.
 */
export function StatusSelect({
  current,
  options,
  onSelect,
  busy = false,
}: {
  /** El `value` de la opción actual. */
  current: string;
  options: StatusOption[];
  onSelect: (value: string) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === current);
  const tone = current === "live" || current === "active" ? "on" : current === "draft" ? "draft" : "off";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={busy}
          aria-label={`Status: ${selected?.label ?? current}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11.5px] font-bold transition-colors duration-150 disabled:cursor-wait",
            tone === "on" && "border border-gold-600 bg-accent/16 text-fg-muted hover:border-accent",
            tone === "draft" && "border border-dashed border-fg-subtle text-fg-muted hover:border-accent",
            tone === "off" && "border border-line text-fg-subtle hover:border-accent",
          )}
        >
          {tone === "on" ? <span className="size-1.5 rounded-full bg-accent" aria-hidden /> : null}
          {selected?.label ?? current}
          <ChevronDown size={13} strokeWidth={2} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          data-theme="dark"
          align="start"
          sideOffset={8}
          className="z-50 w-[300px] rounded-2xl border border-line bg-dark-card p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)]"
        >
          <div role="menu" aria-label="Status">
            {options.map((option) => {
              const checked = option.value === current;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={checked}
                  aria-disabled={option.disabled || undefined}
                  onClick={() => {
                    if (option.disabled || checked) return;
                    setOpen(false);
                    onSelect(option.value);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150",
                    option.disabled ? "cursor-not-allowed opacity-50" : "hover:bg-surface-hover",
                    checked && "bg-accent/12",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-fg">{option.label}</span>
                    {option.detail ? <span className="mt-0.5 block text-[11.5px] text-fg-subtle">{option.detail}</span> : null}
                  </span>
                  {checked ? <Check size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-accent" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
