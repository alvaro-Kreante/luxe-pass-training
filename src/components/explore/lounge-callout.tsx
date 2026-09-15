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
import type { MapLounge } from "./city-map";

/**
 * Callout del lounge seleccionado sobre el mapa (Main.dc.html): card de
 * 302px. Antes se anclaba en % del viewBox del SVG; ahora lo posiciona el
 * `AdvancedMarker` que lo envuelve (mismas coordenadas lat/lng del pin), así
 * que este componente ya no calcula su propia posición.
 */
export function LoungeCallout({
  lounge,
  unit,
}: {
  lounge: MapLounge;
  unit: DistanceUnit;
}) {
  return (
    // `absolute bottom-full left-1/2 -translate-x-1/2` centra este callout
    // sobre un punto de anclaje colapsado, sin tamaño propio: los wrapper
    // divs internos del `AdvancedMarker` que envuelve este componente no
    // llevan más contenido, así que colapsan a las coordenadas lat/lng del
    // marker, y `position: absolute` saca a este nodo del flujo por
    // completo (verificado contra el código real de
    // `@vis.gl/react-google-maps`). Esto es intencional, no un accidente de
    // flexbox — pero es frágil: no le añadas padding ni clases con
    // contenido al `AdvancedMarker` que envuelve este callout en
    // `city-map.tsx` (le daría tamaño propio al ancla y descentraría el
    // callout), y no cambies la raíz de este componente de
    // `position: absolute` a algo relativo.
    <div
      role="group"
      aria-label="Selected lounge"
      className="absolute bottom-full left-1/2 z-10 mb-4 w-[302px] max-w-[calc(100vw-40px)] -translate-x-1/2 overflow-hidden rounded-content bg-surface shadow-[0_24px_50px_-18px_rgb(34_26_20_/_0.40)]"
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
