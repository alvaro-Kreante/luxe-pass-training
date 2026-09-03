import { operatingHoursFor } from "@/lib/lounge-profile";
import { cn } from "@/lib/utils";

/** Story 3.1 — "Operating hours display with today's hours highlighted". */
export function OperatingHours() {
  const rows = operatingHoursFor();

  return (
    <div>
      <p className="m-0 mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-gold-600">
        Operating hours
      </p>
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
    </div>
  );
}
