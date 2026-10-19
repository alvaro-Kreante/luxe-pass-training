"use client";

import { LoungeThumb } from "@/components/lounges/lounge-thumb";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { AmenityIcon } from "./amenity-icon";
import { availabilityLabel } from "@/lib/availability";
import { formatDistance, type DistanceUnit } from "@/lib/distance";
import type { LoungeWithDistance } from "@/lib/lounge-directory";
import { cn } from "@/lib/utils";

/**
 * Card del panel de resultados (Main.dc.html): miniatura de 70px, nombre y
 * distancia, barrio, iconos de amenity y el chip de disponibilidad.
 * La seleccionada lleva borde `--gold-500`, igual que su marker en el mapa.
 */

/** El artboard muestra tres iconos y resume el resto con un "+N". */
const VISIBLE_AMENITIES = 3;

export function ResultCard({
  lounge,
  unit,
  selected,
  onSelect,
  /** En offline no hay disponibilidad en vivo: se dice cuándo se guardó. */
  cachedNote,
}: {
  lounge: LoungeWithDistance;
  unit: DistanceUnit;
  selected: boolean;
  onSelect: () => void;
  cachedNote?: string;
}) {
  const extra = lounge.amenities.length - VISIBLE_AMENITIES;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full cursor-pointer gap-3 rounded-[14px] bg-surface p-3 text-left",
        "transition-shadow duration-150 hover:shadow-content",
        "focus-visible:outline-none focus-visible:shadow-ring",
        selected
          ? "border-[1.5px] border-accent shadow-content"
          : "border border-line hover:border-accent",
      )}
    >
      <LoungeThumb loungeId={lounge.id} src={lounge.mainImageUrl} className="size-[70px] rounded-[10px]" />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[14.5px] font-bold text-fg">{lounge.name}</span>
          <span className="whitespace-nowrap text-[12.5px] font-bold text-accent-strong">
            {formatDistance(lounge.distanceMiles, unit)}
          </span>
        </span>

        <span className="mb-2 mt-[3px] block text-xs text-fg-subtle">
          {lounge.partnerName ? `${lounge.partnerName} · ` : ""}
          {lounge.neighborhood} · {lounge.city}
        </span>

        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-fg-subtle">
            {lounge.amenities.slice(0, VISIBLE_AMENITIES).map((amenity) => (
              <AmenityIcon key={amenity} amenity={amenity} />
            ))}
            {extra > 0 ? (
              <span className="text-[11.5px] font-semibold text-fg-subtle">
                +{extra}
              </span>
            ) : null}
          </span>

          {cachedNote ? (
            <span className="text-[11.5px] text-fg-subtle">{cachedNote}</span>
          ) : (
            <StatusChip available={lounge.slotsToday > 0}>
              {availabilityLabel(lounge)}
            </StatusChip>
          )}
        </span>
      </span>
    </button>
  );
}

/**
 * PERF-10 — la carga de la tarjeta, con su misma caja (borde, `p-3`,
 * miniatura de 70px) para que el panel no cambie de alto al llegar los
 * datos. Sin artboard propio: aplica la regla de DESIGN-SYSTEM.md §5
 * "Estados" (misma geometría que la pieza real); desviación anotada en
 * COMPONENT-MAP.md.
 */
export function ResultCardSkeleton() {
  return (
    <div className="flex w-full gap-3 rounded-[14px] border border-line bg-surface p-3">
      <Skeleton className="size-[70px] shrink-0 rounded-[10px]" />

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-[55%]" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-[70%]" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-[72px]" />
          <Skeleton className="h-5 w-[86px] rounded-full" />
        </div>
      </div>
    </div>
  );
}
