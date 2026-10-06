import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CLOSED, formatDayHours, parseDayHours, TIME_OPTIONS, type DayHours } from "@/lib/lounge-draft";
import { cn } from "@/lib/utils";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// `weekly_hours` va domingo primero; la pantalla empieza el lunes.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * "Operating hours" del formulario del lounge (LoungeAdd.dc.html): switch y
 * desde/hasta por día. Story 10.9 lo reutiliza para el horario de cada
 * temporada (SeasonalEdit.dc.html).
 */
export function WeeklyHoursEditor({
  value,
  onChange,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {WEEK_ORDER.map((index) => {
        const day = WEEKDAY_NAMES[index];
        const hours = parseDayHours(value[index]);
        const update = (next: DayHours) =>
          onChange(value.map((current, i) => (i === index ? formatDayHours(next) : current)));
        return (
          <div
            key={day}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2",
              hours.open ? "border-line" : "border-dashed border-fg-subtle",
            )}
          >
            <span className="w-10 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">{day}</span>
            <Switch
              checked={hours.open}
              onCheckedChange={(open) => update({ ...hours, open })}
              label={`${day} open`}
            />
            {hours.open ? (
              <div className="flex items-center gap-2">
                <Select
                  aria-label={`${day} opens at`}
                  inputSize="compact"
                  value={hours.from}
                  onChange={(event) => update({ ...hours, from: event.target.value })}
                  className="w-[128px]"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
                <span className="text-fg-subtle">–</span>
                <Select
                  aria-label={`${day} closes at`}
                  inputSize="compact"
                  value={hours.to}
                  onChange={(event) => update({ ...hours, to: event.target.value })}
                  className="w-[128px]"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <span className="text-xs font-bold text-fg-subtle">{CLOSED}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
