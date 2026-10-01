import Link from "next/link";

import { LoungeThumb } from "@/components/lounges/lounge-thumb";
import { Rating } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { AmenityIcon } from "./amenity-icon";
import { amenityLabel } from "@/lib/amenities";
import { availabilityLabel } from "@/lib/availability";
import {
  formatDistance,
  walkingMinutes,
  type DistanceUnit,
} from "@/lib/distance";
import type { LoungeWithDistance } from "@/lib/lounge-directory";

/**
 * Story 2.3 — fila de la lista (ListView.dc.html): miniatura de 200×120,
 * nombre y valoración, barrio y horario, las amenities con su etiqueta, y a la
 * derecha la distancia, el tiempo a pie, el estado y la acción.
 */
export function LoungeListItem({
  lounge,
  unit,
}: {
  lounge: LoungeWithDistance;
  unit: DistanceUnit;
}) {
  return (
    <article className="flex flex-col gap-5 rounded-content border border-line bg-surface p-4 transition-shadow duration-150 hover:shadow-content lg:flex-row">
      <LoungeThumb
        loungeId={lounge.id}
        className="h-[120px] w-full rounded-[14px] lg:w-[200px]"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 py-1">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <h3 className="font-sans text-[17px] font-bold text-fg">
              {lounge.name}
            </h3>
            <Rating value={lounge.rating} />
          </div>
          <p className="m-0 text-[12.5px] text-fg-subtle">
            {lounge.partnerName ? `${lounge.partnerName} · ` : ""}
            {lounge.neighborhood} · {lounge.city} · {lounge.hours}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4.5 gap-y-2">
          {lounge.amenities.map((amenity) => (
            <span
              key={amenity}
              className="flex items-center gap-1.5 text-xs text-fg-muted"
            >
              <AmenityIcon amenity={amenity} />
              {amenityLabel(amenity)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-4 py-1 lg:w-[200px] lg:flex-col lg:items-end">
        <div className="lg:text-right">
          <p className="m-0 text-xl font-bold text-accent-strong">
            {formatDistance(lounge.distanceMiles, unit)}
          </p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">
            {walkingMinutes(lounge.distanceMiles)} min walk
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <StatusChip available={lounge.slotsToday > 0}>
            {availabilityLabel(lounge)}
          </StatusChip>
          <Link
            href={`/lounges/${lounge.id}`}
            aria-label={`View details for ${lounge.name}`}
            className="flex h-10 items-center rounded-[11px] border-[1.5px] border-accent px-4.5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong transition-colors duration-150 hover:bg-accent-soft hover:text-accent-strong"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

/** La misma geometría en hueco, para la carga (ListLoading.dc.html). */
export function LoungeListItemSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-content border border-line bg-surface p-4 lg:flex-row">
      <Skeleton className="h-[120px] w-full rounded-[14px] lg:w-[200px]" />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 py-1.5">
        <div>
          <Skeleton className="mb-3 h-[18px] w-[232px] max-w-full" />
          <Skeleton className="h-3 w-[308px] max-w-full" />
        </div>
        <div className="flex gap-3.5">
          <Skeleton className="h-3 w-[82px]" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-[74px]" />
        </div>
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-4 py-1.5 lg:w-[200px] lg:flex-col lg:items-end">
        <Skeleton className="h-5 w-[66px]" />
        <Skeleton className="h-10 w-[158px] rounded-[11px]" />
      </div>
    </div>
  );
}
