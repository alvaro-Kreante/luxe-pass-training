import { ArrowRight } from "lucide-react";

import type { PendingChange } from "@/lib/admin-content";

/**
 * DESIGN-SYSTEM.md §4 "Diff de aprobación" — fijado en la Fase 8. Una línea
 * por cambio: el valor anterior tachado, una flecha dorada y el valor nuevo
 * en negrita, con una nota debajo cuando el cambio arrastra otra cosa.
 */
export function ApprovalDiff({ change }: { change: PendingChange }) {
  return (
    <div className="border-t border-[rgba(58,50,42,0.6)] py-3.5 first:border-t-0 first:pt-0">
      <p className="m-0 text-[12.5px] font-bold text-fg">{change.title}</p>
      <div className="mt-1.5 flex items-center gap-2.5">
        <span className="text-xs text-fg-subtle line-through">{change.fromLabel}</span>
        <ArrowRight size={14} strokeWidth={2} className="text-accent" aria-hidden />
        <span className="text-xs font-bold text-fg">{change.toLabel}</span>
      </div>
      {change.note ? <p className="m-0 mt-1.5 text-[11px] text-fg-subtle">{change.note}</p> : null}
    </div>
  );
}
