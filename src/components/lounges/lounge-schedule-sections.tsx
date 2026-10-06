import { CalendarDays } from "lucide-react";

import { ClosureBanner } from "@/components/lounges/closure-banner";
import { StatusChip } from "@/components/ui/status-chip";
import {
  formatDateRange,
  seasonTitle,
  weekSummary,
  type LoungeClosure,
  type MemberSeason,
} from "@/lib/lounge-schedule";

/**
 * Story 10.9 — "Seasonal hours" y "Special closures" en la ficha del miembro
 * (SeasonalHours.dc.html). Cada cierre reutiliza el aviso de Closure.dc.html.
 * Sin temporadas ni cierres, las secciones no se pintan (NoSchedule.dc.html).
 */
export function LoungeScheduleSections({
  seasons,
  closures,
}: {
  seasons: MemberSeason[];
  closures: LoungeClosure[];
}) {
  return (
    <>
      {seasons.length > 0 ? (
        <section aria-labelledby="seasonal-hours-heading">
          <h2
            id="seasonal-hours-heading"
            className="m-0 mb-2.5 mt-6 font-sans text-xs font-bold uppercase tracking-[0.1em] text-gold-600"
          >
            Seasonal hours
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
            {seasons.map((season) => (
              <li
                key={season.id}
                className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
                  <CalendarDays size={18} strokeWidth={1.6} className="text-gold-600" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 text-[13.5px] font-bold text-fg">{seasonTitle(season)}</p>
                    <StatusChip available={season.inEffect}>
                      {season.inEffect ? "In effect" : "Upcoming"}
                    </StatusChip>
                  </div>
                  <p className="m-0 mt-0.5 text-xs font-semibold text-fg-muted">
                    {formatDateRange(season.startsOn, season.endsOn)}
                  </p>
                  <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-subtle">
                    {weekSummary(season.weeklyHours)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {closures.length > 0 ? (
        <section aria-labelledby="special-closures-heading">
          <h2
            id="special-closures-heading"
            className="m-0 mb-2.5 mt-6 font-sans text-xs font-bold uppercase tracking-[0.1em] text-gold-600"
          >
            Special closures
          </h2>
          <div className="flex flex-col gap-3">
            {closures.map((closure) => (
              <ClosureBanner key={closure.id} closure={toBannerClosure(closure)} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function toBannerClosure(closure: LoungeClosure) {
  return {
    startIso: closure.startsOn,
    endIso: closure.endsOn,
    reason: closure.reason,
    reopensLabel: closure.reopensLabel,
  };
}
