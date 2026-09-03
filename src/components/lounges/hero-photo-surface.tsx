import Image from "next/image";

import { toneOf } from "@/components/lounges/lounge-thumb";
import { cn } from "@/lib/utils";

/**
 * Story 3.1 — bloque de foto compartido por el carousel del perfil y la
 * galería. No hay fotografía real del lounge (docs/PENDIENTES.md), así que
 * se usa el logo de En Soleil sobre el radial de marca en vez de un bloque
 * vacío — y, si lleva leyenda, un degradado detrás para que el texto se lea
 * sobre cualquier tono.
 */
export function HeroPhotoSurface({
  loungeId,
  photoIndex,
  caption,
  detail,
  className,
}: {
  loungeId: string;
  photoIndex: number;
  caption?: string;
  detail?: string;
  className?: string;
}) {
  const tone = (((toneOf(loungeId) - 1 + photoIndex) % 3) + 1) as 1 | 2 | 3;

  return (
    <div className={cn("absolute inset-0", className)}>
      <div aria-hidden data-tone={tone} className="lounge-hero absolute inset-0" />
      <Image
        src="/logo.png"
        alt=""
        aria-hidden
        fill
        sizes="400px"
        className="object-contain p-[16%] opacity-80"
      />

      {caption ? (
        <>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-panel-black/85 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="m-0 text-[12.5px] font-semibold text-gold-100">{caption}</p>
            {detail ? (
              <p className="m-0 mt-1 text-[11px] text-gold-100/80">{detail}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
