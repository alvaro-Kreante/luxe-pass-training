"use client";

import Link from "next/link";

import { LoungeThumb } from "@/components/lounges/lounge-thumb";
import { Rating } from "@/components/ui/rating";
import { StatusChip } from "@/components/ui/status-chip";
import { availabilityLabel } from "@/lib/availability";
import {
  formatDistance,
  walkingMinutes,
  type DistanceUnit,
} from "@/lib/distance";
import { MAP_VIEWBOX } from "./city-map-base";
import type { Lounge } from "@/lib/lounges";

/**
 * Callout del lounge seleccionado sobre el mapa (Main.dc.html): card de 302px
 * anclada al marker, con la acción que sale de este flujo hacia el Epic 3.
 *
 * Se ancla en porcentaje del plano, no en píxeles: el marker que lo dispara
 * está posicionado igual, así que ambos se mueven juntos al redimensionar.
 */

/** Pasado este punto el callout se dibuja a la izquierda para no salirse. */
const FLIP_AT = 0.55;

export function LoungeCallout({
  lounge,
  unit,
}: {
  lounge: Lounge;
  unit: DistanceUnit;
}) {
  if (!lounge.map) return null;

  const left = lounge.map.x / MAP_VIEWBOX.width;
  const top = lounge.map.y / MAP_VIEWBOX.height;
  const flip = left > FLIP_AT;

  return (
    <div
      role="group"
      aria-label="Selected lounge"
      className="absolute z-10 w-[302px] max-w-[calc(100%-40px)] overflow-hidden rounded-content bg-surface shadow-[0_24px_50px_-18px_rgb(34_26_20_/_0.40)]"
      style={{
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        transform: `translate(${flip ? "calc(-100% - 28px)" : "28px"}, -60%)`,
      }}
    >
      <div className="flex gap-3 px-3.5 pb-2.5 pt-3.5">
        <LoungeThumb
          loungeId={lounge.id}
          className="size-[74px] rounded-control"
        />

        <div className="min-w-0 flex-1">
          <p className="m-0 mb-1 text-[15.5px] font-bold text-fg">
            {lounge.name}
          </p>
          <p className="m-0 mb-2 text-xs text-fg-subtle">
            {lounge.neighborhood} · {formatDistance(lounge.distanceMiles, unit)} ·{" "}
            {walkingMinutes(lounge.distanceMiles)} min walk
          </p>
          <div className="flex items-center gap-2">
            <Rating value={lounge.rating} />
            <StatusChip size="sm" available={lounge.slotsToday > 0}>
              {availabilityLabel(lounge)}
            </StatusChip>
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-3.5">
        <Link
          href={`/lounges/${lounge.id}`}
          className="flex h-11 w-full items-center justify-center rounded-[11px] bg-accent text-[12.5px] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors duration-150 hover:bg-accent-strong hover:text-on-accent"
        >
          View details
        </Link>
      </div>
    </div>
  );
}
