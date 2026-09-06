import { Cake, CalendarCheck, Clock, LifeBuoy, MapPin, Users } from "lucide-react";

import { MEMBERSHIP_BENEFITS } from "@/lib/membership";

const ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  visits: CalendarCheck,
  lounges: MapPin,
  birthday: Cake,
  referral: Users,
  cancellation: Clock,
  support: LifeBuoy,
};

/**
 * "What your membership includes" — `Main.dc.html`. Story 9.1 — "Benefits
 * explanation". Los seis beneficios ya están anclados a algo fijado en fases
 * anteriores (visitas, lounges, cumpleaños, referido, cancelación, soporte).
 */
export function BenefitsGrid() {
  return (
    <div className="rounded-content border border-line bg-surface p-5.5 shadow-content">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
        What your membership includes
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-x-5 gap-y-3">
        {MEMBERSHIP_BENEFITS.map((benefit) => {
          const Icon = ICONS[benefit.id];
          return (
            <div key={benefit.id} className="flex gap-2.5">
              <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
                <Icon size={17} strokeWidth={1.7} className="text-accent-strong" aria-hidden />
              </span>
              <div>
                <p className="m-0 text-[13px] font-bold text-fg">{benefit.title}</p>
                <p className="m-0 mt-0.5 text-[11.5px] leading-[1.5] text-fg-subtle">{benefit.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
