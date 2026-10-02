"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Spinner } from "@/components/ui/spinner";
import {
  LoungeListItem,
  LoungeListItemSkeleton,
} from "./lounge-list-item";
import { usePagedCount } from "./use-paged-count";
import type { DistanceUnit } from "@/lib/distance";
import type { LoungeWithDistance } from "@/lib/lounge-directory";

/**
 * Story 2.3 — List View Alternative.
 * Artboards: ListView.dc.html · ListLoading.dc.html
 */

/** Filas en hueco mientras se buscan lounges (ListLoading.dc.html). */
const LOADING_ROWS = 3;

export function LoungeList({
  lounges,
  unit,
  loading = false,
  distanceNote,
}: {
  lounges: LoungeWithDistance[];
  unit: DistanceUnit;
  loading?: boolean;
  /** "Searching within 2 mi of your location" y equivalentes. */
  distanceNote: string;
}) {
  const { shown, hasMore, sentinel } = usePagedCount(lounges.length);

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
