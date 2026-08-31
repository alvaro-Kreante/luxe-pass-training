"use client";

import { ChevronRight, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { FilterSuggestion } from "@/lib/filters";

/**
 * Story 2.2 — "No results state with suggestions to modify filters".
 * Artboard: NoResults.dc.html
 *
 * Sustituye al panel y al mapa: cuando no hay nada que enseñar, lo único útil
 * es qué cambio devolvería resultados, y cada fila lo dice con su cifra real.
 */
export function NoResults({
  activeFilterCount,
  totalNearby,
  suggestions,
  onApply,
  onBackToMap,
  onClearAll,
}: {
  activeFilterCount: number;
  totalNearby: number;
  suggestions: FilterSuggestion[];
  onApply: (suggestion: FilterSuggestion) => void;
  onBackToMap: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-subtle px-5 pb-8 pt-6 lg:px-8">
      <div className="mb-4.5 flex items-baseline justify-between gap-4">
        <Eyebrow>No lounges match these filters</Eyebrow>
        <span className="text-[12.5px] text-fg-subtle">
          0 of {totalNearby} lounges
        </span>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-y-auto">
        <EmptyState
          width={660}
          icon={SearchX}
          title={`Nothing matches all ${activeFilterCount} filters`}
          description="Any of these changes brings results back."
        >
          <div className="mb-6 flex flex-col gap-2.5 text-left">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onApply(suggestion)}
                className="flex cursor-pointer items-center gap-3.5 rounded-[14px] border border-line px-4.5 py-3.5 transition-colors duration-150 hover:border-accent hover:bg-surface-hover focus-visible:outline-none focus-visible:shadow-ring"
              >
                <span className="flex-1">
                  <span className="block text-sm font-bold text-fg">
                    {suggestion.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-fg-subtle">
                    {suggestion.count}{" "}
                    {suggestion.count === 1 ? "lounge" : "lounges"} would match
                  </span>
                </span>
                <ChevronRight
                  size={17}
                  strokeWidth={1.9}
                  className="shrink-0 text-fg-subtle"
                />
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" block onClick={onBackToMap}>
              Back to map
            </Button>
            <Button block onClick={onClearAll}>
              Clear all filters
            </Button>
          </div>
        </EmptyState>
      </div>
    </div>
  );
}
