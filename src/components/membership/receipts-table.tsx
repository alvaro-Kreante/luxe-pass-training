import type * as React from "react";
import { ExternalLink } from "lucide-react";

import { StatusChip } from "@/components/ui/status-chip";
import type { Receipt } from "@/lib/billing";
import { formatCurrency } from "@/lib/partner";
import { cn } from "@/lib/utils";

/**
 * "Lista de datos clara" (patrón 25, DESIGN-SYSTEM.md §5) — `Receipts.dc.html`.
 * Inline como `ReferralInvitationsTable`: rejilla propia de 5 columnas.
 * "Refunded" usa el `StatusChip` no disponible (borde, sin fondo) en vez del
 * fondo `--bg-blush-1` del artboard: misma lectura con el primitivo existente.
 */
const GRID_STYLE: React.CSSProperties = { gridTemplateColumns: "96px minmax(0,1fr) 92px 92px 76px" };

const HEADER_CLASS = "text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle";

export function ReceiptsTable({ receipts }: { receipts: Receipt[] }) {
  return (
    <div role="table" className="overflow-hidden rounded-content border border-line bg-surface shadow-content">
      <div role="row" className="grid gap-3.5 border-b border-line bg-blush-2 px-5 py-3" style={GRID_STYLE}>
        <span role="columnheader" className={HEADER_CLASS}>Date</span>
        <span role="columnheader" className={HEADER_CLASS}>Description</span>
        <span role="columnheader" className={cn(HEADER_CLASS, "text-right")}>Amount</span>
        <span role="columnheader" className={HEADER_CLASS}>Status</span>
        <span role="columnheader" className="sr-only">Receipt</span>
      </div>

      {receipts.length === 0 ? <p className="m-0 px-5 py-4.5 text-[12.5px] text-fg-muted">No charges yet.</p> : null}

      {receipts.map((receipt, index) => (
        <div
          key={receipt.id}
          role="row"
          style={GRID_STYLE}
          className={cn(
            "grid items-center gap-3.5 px-5 py-3.75 transition-colors duration-150 hover:bg-blush-2",
            index < receipts.length - 1 && "border-b border-line",
          )}
        >
          <span role="cell" className="text-[13px] text-fg-muted">
            {receipt.dateLabel}
          </span>
          <div role="cell" className="min-w-0">
            <p className="m-0 text-[13.5px] font-bold text-fg">{receipt.title}</p>
            {receipt.subtitle ? <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{receipt.subtitle}</p> : null}
          </div>
          <span
            role="cell"
            className={cn(
              "text-right text-[13.5px] font-bold",
              receipt.status === "refunded" ? "text-fg-subtle line-through" : "text-fg",
            )}
          >
            {formatCurrency(receipt.amount)}
          </span>
          <span role="cell">
            <StatusChip available={receipt.status === "paid"}>{receipt.status === "paid" ? "Paid" : "Refunded"}</StatusChip>
          </span>
          <span role="cell" className="justify-self-end">
            {receipt.receiptUrl ? (
              <a
                href={receipt.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-accent-strong"
              >
                Receipt
                <ExternalLink size={13} strokeWidth={1.6} aria-hidden />
              </a>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
