"use client";

import { Drawer } from "@/components/patterns/drawer";
import { Button } from "@/components/ui/button";
import { AmenityIcon } from "./amenity-icon";
import { AvailabilityCalendar } from "./availability-calendar";
import { AMENITIES } from "@/lib/amenities";
import { TIME_BANDS } from "@/lib/availability";
import {
  DISTANCE_BANDS,
  EMPTY_FILTERS,
  countMatching,
  isOpenOn,
  type Filters,
} from "@/lib/filters";
import type { LoungeWithDistance } from "@/lib/lounge-directory";
import { cn } from "@/lib/utils";

/**
 * Story 2.2 — el drawer de filtros (Filters.dc.html), patrón 6.
 *
 * Los filtros se aplican al instante ("Filter results update in real-time"):
 * el botón de confirmar solo cierra el panel y, mientras, dice cuántos lounges
 * quedan. Lo comparten el mapa y la lista.
 */
export function FilterDrawer({
  open,
  onOpenChange,
  lounges,
  filters,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lounges: LoungeWithDistance[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const matching = countMatching(lounges, filters);

  /**
   * Un día se ofrece si algún lounge de la ciudad abre, sin mirar el resto de
   * filtros: si dependiera de ellos, el día que deja la búsqueda sin resultados
   * quedaría deshabilitado y nunca se podría llegar al estado vacío.
   */
  const hasAvailability = (date: string) =>
    lounges.some((lounge) => isOpenOn(lounge, date));

  const toggleAmenity = (id: (typeof AMENITIES)[number]["id"]) =>
    onChange({
      ...filters,
      amenities: filters.amenities.includes(id)
        ? filters.amenities.filter((other) => other !== id)
        : [...filters.amenities, id],
    });

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Refine your search"
      title="Filters"
      footer={
        <>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}
            >
              Clear all
            </Button>
            <Button
              className="flex-[1.6]"
              onClick={() => onOpenChange(false)}
            >
              Show {matching} {matching === 1 ? "lounge" : "lounges"}
            </Button>
          </div>
          <p className="m-0 mt-3 text-center text-xs text-fg-subtle">
            Results update on the map as you change filters.
          </p>
        </>
      }
    >
      <p className="m-0 mb-3 text-[13px] font-semibold text-fg">Amenities</p>
      <div className="mb-7 flex flex-wrap gap-2">
        {AMENITIES.map((amenity) => {
          const selected = filters.amenities.includes(amenity.id);

          return (
            <button
              key={amenity.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleAmenity(amenity.id)}
              className={cn(
                "flex cursor-pointer items-center gap-[7px] rounded-pill px-4 py-2 text-[12.5px]",
                "transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-ring",
                selected
                  ? "bg-accent font-bold text-on-accent"
                  : "border border-line font-semibold text-fg-muted hover:border-accent",
              )}
            >
              <AmenityIcon amenity={amenity.id} />
              {amenity.label}
            </button>
          );
        })}
      </div>

      <p className="m-0 mb-3 text-[13px] font-semibold text-fg">Distance</p>
      <div className="mb-7 flex gap-2">
        {DISTANCE_BANDS.map((band) => (
          <OptionButton
            key={band}
            selected={filters.maxDistanceMiles === band}
            onClick={() =>
              onChange({
                ...filters,
                maxDistanceMiles:
                  filters.maxDistanceMiles === band ? null : band,
              })
            }
          >
            &lt; {band} mi
          </OptionButton>
        ))}
      </div>

      <AvailabilityCalendar
        selected={filters.date}
        hasAvailability={hasAvailability}
        onSelect={(date) =>
          onChange({ ...filters, date: filters.date === date ? null : date })
        }
      />

      <div className="mb-6 flex gap-2">
        {TIME_BANDS.map((slot) => (
          <OptionButton
            key={slot.id}
            selected={filters.band === slot.id}
            onClick={() =>
              onChange({
                ...filters,
                band: filters.band === slot.id ? null : slot.id,
              })
            }
          >
            {slot.label}
          </OptionButton>
        ))}
      </div>
    </Drawer>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-[42px] flex-1 cursor-pointer items-center justify-center rounded-[11px] text-[12.5px]",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-ring",
        selected
          ? "bg-accent font-bold text-on-accent"
          : "border border-line font-semibold text-fg-muted hover:border-accent",
      )}
    >
      {children}
    </button>
  );
}
