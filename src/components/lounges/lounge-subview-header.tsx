import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FreshnessNote } from "@/components/lounges/freshness-note";
import { toneOf } from "@/components/lounges/lounge-thumb";
import type { Lounge } from "@/lib/lounges";

/**
 * DESIGN-SYSTEM.md §5 patrón 8 — Sub-vista de lounge. Topbar de 64px +
 * header de 84px (miniatura, nombre, barrio y dirección, sello de frescura).
 * Compartido por `Availability.dc.html`, `Closure.dc.html`, `Reviews.dc.html`
 * y `NoRatings.dc.html`. El patrón 9 (flujo de reserva) reutiliza el mismo
 * componente con `topbarRight` ("Booking help", "Secure checkout").
 *
 * Dos posiciones de chip distintas, tal como las dibujan los artboards:
 * `badge` va junto al título ("Accepting bookings" en `Main.dc.html`, "New on
 * LuxePass" en `NoRatings.dc.html`); `trailingBadge` va en el extremo derecho,
 * donde por defecto vive el sello de frescura — el chip "Slot held for M:SS"
 * de `Payment.dc.html`/`Summary.dc.html` lo sustituye ahí, no junto al título.
 */
export function LoungeSubviewHeader({
  lounge,
  backHref,
  backLabel,
  address,
  badge,
  trailingBadge,
  topbarRight,
  hideFreshness,
}: {
  lounge: Lounge;
  backHref: string;
  backLabel: string;
  address: string;
  badge?: React.ReactNode;
  trailingBadge?: React.ReactNode;
  topbarRight?: React.ReactNode;
  hideFreshness?: boolean;
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
        <div className="flex-1" />
        {topbarRight}
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
        {trailingBadge}
        {hideFreshness ? null : <FreshnessNote />}
      </div>
    </>
  );
}
