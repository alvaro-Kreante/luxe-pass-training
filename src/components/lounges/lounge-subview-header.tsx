import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FreshnessNote } from "@/components/lounges/freshness-note";
import { toneOf } from "@/components/lounges/lounge-thumb";
import type { Lounge } from "@/lib/lounges";

/**
 * DESIGN-SYSTEM.md §5 patrón 8 — Sub-vista de lounge. Topbar de 64px +
 * header de 84px (miniatura, nombre, barrio y dirección, sello de frescura).
 * Compartido por `Availability.dc.html`, `Closure.dc.html`, `Reviews.dc.html`
 * y `NoRatings.dc.html`.
 */
export function LoungeSubviewHeader({
  lounge,
  backHref,
  backLabel,
  address,
  badge,
}: {
  lounge: Lounge;
  backHref: string;
  backLabel: string;
  address: string;
  badge?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-[13.5px] font-semibold text-fg-muted"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden />
          {backLabel}
        </Link>
      </div>

      <div className="flex h-[84px] shrink-0 items-center gap-4 border-b border-line bg-surface px-8">
        <span
          aria-hidden
          data-tone={toneOf(lounge.id)}
          className="lounge-hero size-13 shrink-0 rounded-xl"
        />
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[22px] text-fg">{lounge.name}</h2>
            {badge}
          </div>
          <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">{address}</p>
        </div>
        <div className="flex-1" />
        <FreshnessNote />
      </div>
    </>
  );
}
