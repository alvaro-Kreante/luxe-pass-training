import { Clock, Sparkle, UserRound, type LucideIcon } from "lucide-react";

/** Story 3.2 — "Booking restrictions display (member tier, advance notice)". */
const ICONS: LucideIcon[] = [Sparkle, Clock, UserRound];

export function BookingRestrictions({ restrictions }: { restrictions: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {restrictions.map((restriction, index) => {
        const Icon = ICONS[index % ICONS.length];

        return (
          <p
            key={restriction}
            className="m-0 flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-fg-muted"
          >
            <Icon
              size={15}
              strokeWidth={1.7}
              className="mt-0.5 shrink-0 text-fg-subtle"
              aria-hidden
            />
            {restriction}
          </p>
        );
      })}
    </div>
  );
}
