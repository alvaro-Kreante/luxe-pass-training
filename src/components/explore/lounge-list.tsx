"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Spinner } from "@/components/ui/spinner";
import {
  LoungeListItem,
  LoungeListItemSkeleton,
} from "./lounge-list-item";
import type { DistanceUnit } from "@/lib/distance";
import type { Lounge } from "@/lib/lounges";

/**
 * Story 2.3 — List View Alternative.
 * Artboards: ListView.dc.html · ListLoading.dc.html
 */

/** Cuántos lounges trae cada tanda del scroll infinito. */
const PAGE_SIZE = 4;

/** Filas en hueco mientras se buscan lounges (ListLoading.dc.html). */
const LOADING_ROWS = 3;

export function LoungeList({
  lounges,
  unit,
  loading = false,
  distanceNote,
}: {
  lounges: Lounge[];
  unit: DistanceUnit;
  loading?: boolean;
  /** "Searching within 2 mi of your location" y equivalentes. */
  distanceNote: string;
}) {
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const sentinel = React.useRef<HTMLDivElement>(null);

  /** Cambiar de filtro es empezar otra lista: se vuelve a la primera tanda. */
  const [countWhenReset, setCountWhenReset] = React.useState(lounges.length);
  if (countWhenReset !== lounges.length) {
    setCountWhenReset(lounges.length);
    setVisible(PAGE_SIZE);
  }

  /** El filtro puede dejar menos lounges de los que ya se estaban viendo. */
  const shown = Math.min(visible, lounges.length);
  const hasMore = shown < lounges.length;

  React.useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible((current) => current + PAGE_SIZE);
      }
    });

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore]);

  if (loading) {
    return (
      <Wrapper>
        <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <Spinner size={16} />
            <Eyebrow>Finding lounges near you</Eyebrow>
          </span>
          <span className="text-[12.5px] text-fg-subtle">{distanceNote}</span>
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: LOADING_ROWS }, (_, index) => (
            <LoungeListItemSkeleton key={index} />
          ))}
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div className="mb-4.5 flex flex-wrap items-baseline justify-between gap-3">
        <Eyebrow>
          {lounges.length} {lounges.length === 1 ? "lounge" : "lounges"} near
          you · sorted by distance
        </Eyebrow>
        <span className="text-[12.5px] text-fg-subtle">
          Showing {shown} of {lounges.length}
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        {lounges.slice(0, shown).map((lounge) => (
          <LoungeListItem key={lounge.id} lounge={lounge} unit={unit} />
        ))}
      </div>

      {hasMore ? (
        <div
          ref={sentinel}
          className="flex items-center justify-center gap-2.5 px-0 pb-2 pt-4"
        >
          <Spinner />
          <span className="text-[12.5px] text-fg-subtle">
            Loading more lounges…
          </span>
        </div>
      ) : null}
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface-subtle px-5 pb-8 pt-6 lg:px-8">
      {children}
    </div>
  );
}
