import { StatusChip } from "@/components/ui/status-chip";
import type { HoursRow } from "@/lib/lounge-profile";
import { seasonNote, seasonTitle, type LoungeSeason } from "@/lib/lounge-schedule";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — "Operating hours display with today's hours highlighted".
 * Story 10.9 — con una temporada en curso, su nombre junto al título y la
 * nota de cuándo vuelve el horario habitual (SeasonalHours.dc.html); los
 * días de un cierre salen "Closed · motivo" (ClosedToday.dc.html). `rows`
 * llega ya resuelto (`weekHoursFrom`).
 */
export function OperatingHours({ rows, season }: { rows: HoursRow[]; season?: LoungeSeason | null }) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
          Operating hours
        </p>
        {season ? <StatusChip>{seasonTitle(season)}</StatusChip> : null}
      </div>
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between px-2.5 py-1.5",
              row.isToday && "rounded-lg bg-accent-soft",
            )}
          >
            <span
              className={cn(
                "text-[12.5px]",
                row.isToday ? "font-bold text-fg" : "text-fg-muted",
              )}
            >
              {row.label}
            </span>
            <span
              className={cn(
                "text-[12.5px]",
                row.isToday ? "font-bold text-fg" : "text-fg-muted",
              )}
            >
              {row.hours}
            </span>
          </div>
        ))}
      </div>
      {season ? (
        <p className="m-0 mx-2.5 mt-2 text-[11.5px] text-fg-subtle">{seasonNote(season)}</p>
      ) : null}
    </div>
  );
}
