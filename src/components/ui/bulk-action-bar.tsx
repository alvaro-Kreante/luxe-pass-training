import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DESIGN-SYSTEM.md §4 "Barra de acción masiva" — fijada en la Fase 8. Franja
 * de 52px sobre la lista con la casilla en estado indeterminado, el
 * recuento y, a la derecha, los botones de acción — la destructiva con
 * borde discontinuo.
 */
export function BulkActionBar({
  count,
  itemLabel = "lounge",
  onClear,
  note,
  children,
}: {
  count: number;
  itemLabel?: string;
  onClear: () => void;
  /** Story 10.11 — p. ej. "1 hidden by the search" (PartnerBulkSelect.dc.html). */
  note?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border-[1.5px] border-accent bg-[rgba(201,168,118,0.16)] px-5 py-2">
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-accent">
        <Check size={13} strokeWidth={3} className="text-on-accent" />
      </span>
      <p className="m-0 whitespace-nowrap text-[13.5px] font-bold text-fg">
        {count} {count === 1 ? itemLabel : `${itemLabel}s`} selected
      </p>
      {note ? <p className="m-0 whitespace-nowrap text-[12px] text-fg-muted">{note}</p> : null}
      <div className="flex-1" />
      {children}
      <button type="button" onClick={onClear} className="text-xs font-bold text-accent-strong">
        Clear
      </button>
    </div>
  );
}

export function BulkActionButton({
  children,
  destructive,
  onClick,
}: {
  children: ReactNode;
  destructive?: boolean;
  /** Story 8.3 — real solo para "Archive"; el resto de botones de esta barra siguen inertes (ningún artboard dibuja su destino). */
  onClick?: () => void;
}) {
  const className = cn(
    "flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border-[1.5px] px-3.5 text-xs font-bold text-fg",
    destructive ? "border-dashed border-fg-subtle text-fg-muted" : "border-gold-600",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return <span className={className}>{children}</span>;
}
