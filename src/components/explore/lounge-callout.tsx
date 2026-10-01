"use client";

import * as React from "react";
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
import { cn } from "@/lib/utils";
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
  const ref = React.useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const container = el.closest("[data-map-surface]");
    if (!container) return;

    const calloutRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setFlipped(calloutRect.top < containerRect.top);
  }, [lounge.id]);

  return (
    // `absolute left-1/2 -translate-x-1/2` centra este callout sobre un
    // punto de anclaje colapsado, sin tamaño propio: los wrapper divs
    // internos del `AdvancedMarker` que envuelve este componente no llevan
    // más contenido, así que colapsan a las coordenadas lat/lng del marker,
    // y `position: absolute` saca a este nodo del flujo por completo
    // (verificado contra el código real de `@vis.gl/react-google-maps`).
    // Esto es intencional, no un accidente de flexbox — pero es frágil: no
    // le añadas padding ni clases con contenido al `AdvancedMarker` que
    // envuelve este callout en `city-map.tsx` (le daría tamaño propio al
    // ancla y descentraría el callout), y no cambies la raíz de este
    // componente de `position: absolute` a algo relativo.
    //
    // Por defecto se ancla arriba del pin (`bottom-full`); si el pin está
    // cerca del borde superior del contenedor del mapa (el wrapper
    // `overflow-hidden` marcado con `data-map-surface` en `city-map.tsx` —
    // un atributo de datos, no la clase de estilo `bg-map-land`, para que
    // este anclaje no se rompa en silencio si esa clase cambia por motivos
    // puramente visuales), el callout se clipea. `useLayoutEffect` mide la
    // posición real ya renderizada y, si hace falta, lo voltea a
    // `top-full` antes de que el navegador pinte — sin parpadeo.
    <div
      ref={ref}
      role="group"
      aria-label="Selected lounge"
      // `<Map onClick={onDeselect}>` (city-map.tsx) escucha el clic de
      // Google Maps a nivel de mapa; sin cortar la propagación aquí, un
      // clic en este callout (incluido "View details") burbujea hasta ese
      // handler y deselecciona el lounge — desmontando este callout — antes
      // de que la navegación del `Link` de abajo llegue a completarse.
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "absolute left-1/2 z-10 w-[302px] max-w-[calc(100vw-40px)] -translate-x-1/2 overflow-hidden rounded-content bg-surface shadow-[0_24px_50px_-18px_rgb(34_26_20_/_0.40)]",
        flipped ? "top-full mt-4" : "bottom-full mb-4",
      )}
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
            {lounge.partnerName ? `${lounge.partnerName} · ` : ""}
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
          // Google avisa en consola que el contenido de un AdvancedMarker
          // (city-map.tsx) no soporta hijos enfocables ("Focusable child
          // elements in AdvancedMarkerElement are not supported"): sin
          // sacarlo del tab order, Google intercepta el foco entre
          // mousedown y mouseup y desmonta este callout a mitad del clic,
          // así que "View details" nunca llegaba a navegar (regresión
          // cubierta en lounge-callout.test.tsx). Sigue siendo clickable
          // con ratón y anunciable por lector de pantalla (rol de link
          // nativo) — solo sale del tab order del teclado; el mismo lounge
          // se puede tabular desde la lista de resultados.
          tabIndex={-1}
          className="flex h-11 w-full items-center justify-center rounded-[11px] bg-accent text-[12.5px] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors duration-150 hover:bg-accent-strong hover:text-on-accent"
        >
          View details
        </Link>
      </div>
    </div>
  );
}
