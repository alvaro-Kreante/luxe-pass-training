import { Clock } from "lucide-react";

import { formatCountdown } from "@/lib/booking";

/**
 * `Payment.dc.html` / `Summary.dc.html` — chip "Slot held for M:SS" que
 * sustituye al sello de frescura en el header del patrón 9 durante el
 * checkout.
 */
export function SlotHoldBadge({ secondsLeft }: { secondsLeft: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3.5 py-1.5">
      <Clock size={14} strokeWidth={1.9} className="text-accent-strong" aria-hidden />
      <span className="text-[12.5px] font-bold text-fg">
        Slot held for {formatCountdown(secondsLeft)}
      </span>
    </span>
  );
}
