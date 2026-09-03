import Link from "next/link";
import { CalendarOff } from "lucide-react";

import type { Closure } from "@/lib/lounge-profile";
import { formatWeekdayDate } from "@/lib/lounge-profile";

/**
 * Story 3.2 — "Holiday/special event closure notifications" (Closure.dc.html).
 */
export function ClosureBanner({ closure }: { closure: Closure }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-accent bg-accent-soft p-4">
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-surface">
        <CalendarOff size={18} strokeWidth={1.8} className="text-gold-600" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="m-0 text-[13.5px] font-bold text-fg">
          Closed {formatWeekdayDate(closure.startIso)} – {formatWeekdayDate(closure.endIso)}{" "}
          for {closure.reason}
        </p>
        <p className="m-0 mt-0.5 text-[12.5px] text-fg-muted">
          Bookings are paused on these dates. The lounge reopens {closure.reopensLabel}.
        </p>
      </div>
      <Link href="/explore" className="text-[12.5px] font-bold">
        Find another lounge
      </Link>
    </div>
  );
}
