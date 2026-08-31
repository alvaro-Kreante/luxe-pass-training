import Link from "next/link";
import { MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Rating } from "@/components/ui/rating";
import type { Lounge } from "@/lib/lounges";

/**
 * Card de lounge destacado del Home (Home.dc.html, epic-1-onboarding):
 * hero de 150px, nombre, ciudad con pin, y la fila de valoración + enlace.
 */
export function FeaturedLoungeCard({
  lounge,
  tone,
}: {
  lounge: Lounge;
  /** 1–3, para que la rejilla no repita el mismo radial. */
  tone: 1 | 2 | 3;
}) {
  return (
    <Card variant="content" padded={false} interactive className="overflow-hidden">
      <div data-tone={tone} className="lounge-hero h-[150px]" />

      <div className="px-5 pt-4.5 pb-5">
        <p className="mb-1.5 text-[15.5px] font-bold text-fg">{lounge.name}</p>

        <p className="mb-2.5 flex items-center gap-1.5 text-[12.5px] text-fg-subtle">
          <MapPin size={13} strokeWidth={1.8} />
          {lounge.city}
        </p>

        <div className="flex items-center justify-between">
          <Rating value={lounge.rating} />
          <Link
            href={`/lounges/${lounge.id}`}
            aria-label={`View details for ${lounge.name}`}
            className="text-[12.5px] font-bold"
          >
            View details
          </Link>
        </div>
      </div>
    </Card>
  );
}
