"use client";

import * as React from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Clock, MapPin, SatelliteDish } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import type { Place } from "@/lib/place-search";
import { cn } from "@/lib/utils";
import { useLocationOptions, type LocationOption } from "./use-location-options";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

/**
 * Story 2.1 — permiso de ubicación y su alternativa manual.
 * Artboards: LocationPermission.dc.html (520px) y ManualLocation.dc.html (540px).
 */

export function LocationPermissionDialog({
  open,
  onAllow,
  onEnterManually,
}: {
  open: boolean;
  onAllow: () => void;
  onEnterManually: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={() => {}}
      width={520}
      align="center"
      eyebrow="Before you explore"
      title="Let LuxePass use your location"
      description="We show the lounges closest to you and how far each one is, in the units your phone already uses. You can turn this off at any time in Settings."
      media={
        <span className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-accent-soft">
          <MapPin size={34} strokeWidth={1.6} className="text-accent-strong" />
        </span>
      }
    >
      <div className="flex flex-col gap-3 pb-6">
        <Button block onClick={onAllow}>
          Allow location access
        </Button>
        <Button block variant="secondary" onClick={onEnterManually}>
          Enter a location instead
        </Button>
        <p className="m-0 mt-1.5 text-center text-xs leading-[1.55] text-fg-subtle">
          Your location is never shared with partner venues.
        </p>
      </div>
    </Modal>
  );
}

interface ManualLocationProps {
  open: boolean;
  onConfirm: (place: Place) => void;
  onRetryGps: () => void;
  /** Catálogo ya traído de Supabase — ver `lib/lounge-directory.ts`. */
  lounges: { cityId: string }[];
  /** La última ubicación escrita a mano — ver `lib/explore-location.ts`. */
  recent: Place | null;
}

export function ManualLocationDialog(props: ManualLocationProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <ManualLocationDialogInner {...props} />
    </APIProvider>
  );
}

function ManualLocationDialogInner({
  open,
  onConfirm,
  onRetryGps,
  lounges,
  recent,
}: ManualLocationProps) {
  const [query, setQuery] = React.useState("");
  const [chosen, setChosen] = React.useState<LocationOption | null>(null);
  const [resolving, setResolving] = React.useState(false);

  const matches = useLocationOptions(query, lounges);
  const recentOption: LocationOption | null = recent
    ? { id: "recent", main: recent.label, secondary: "", resolve: async () => recent }
    : null;

  async function confirm() {
    if (!chosen) return;
    setResolving(true);
    const place = await chosen.resolve();
    setResolving(false);
    if (place) onConfirm(place);
  }

  return (
    <Modal
      open={open}
      onOpenChange={() => {}}
      width={540}
      eyebrow={
        <span className="flex items-center gap-2.5">
          <SatelliteDish size={17} strokeWidth={1.8} />
          GPS unavailable
        </span>
      }
      title="Enter your location"
      description="We couldn't get a location fix. Type a city or address and we'll list the lounges nearest to it."
      footer={
        <>
          <Button
            block
            disabled={chosen === null || resolving}
            onClick={() => void confirm()}
          >
            Use this location
          </Button>
          <p className="m-0 mt-4 text-center text-[13px]">
            <button
              type="button"
              onClick={onRetryGps}
              className="cursor-pointer font-bold text-accent-strong transition-colors duration-150 hover:text-fg"
            >
              Try GPS again
            </button>
          </p>
        </>
      }
    >
      <div className="pb-2">
        <Input
          aria-label="City or address"
          placeholder="City or address"
          icon={<MapPin size={18} strokeWidth={1.7} className="text-accent-strong" />}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setChosen(null);
          }}
        />

        <ul
          role="listbox"
          aria-label="Matching locations"
          className="mt-4 flex list-none flex-col gap-0.5 p-0"
        >
          {matches.map((option) => (
            <LocationOptionRow
              key={option.id}
              option={option}
              selected={chosen?.id === option.id}
              onSelect={() => setChosen(option)}
            />
          ))}
        </ul>

        {matches.length === 0 && query.trim() !== "" ? (
          <p className="mt-4 text-[13px] text-fg-subtle">
            No location matches that yet.
          </p>
        ) : null}

        {recentOption ? (
          <>
            <Eyebrow muted className="mb-2 mt-5">
              Recent
            </Eyebrow>
            <ul role="listbox" aria-label="Recent locations" className="list-none p-0">
              <LocationOptionRow
                option={recentOption}
                selected={chosen?.id === recentOption.id}
                onSelect={() => setChosen(recentOption)}
                icon={Clock}
              />
            </ul>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

function LocationOptionRow({
  option,
  selected,
  onSelect,
  icon: Icon = MapPin,
}: {
  option: LocationOption;
  selected: boolean;
  onSelect: () => void;
  icon?: typeof MapPin;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onSelect}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-nav px-3.5 py-3 text-left",
          "transition-colors duration-150 hover:bg-accent-soft",
          "focus-visible:outline-none focus-visible:shadow-ring",
          selected && "bg-accent-soft",
        )}
      >
        <Icon
          size={17}
          strokeWidth={1.7}
          className={selected ? "text-accent-strong" : "text-fg-subtle"}
        />
        <span className="flex-1 text-[13.5px] font-semibold text-fg-muted">
          <span className={cn(selected && "font-bold text-fg")}>{option.main}</span>
          {option.secondary ? (
            <>
              {" "}
              <span className="font-medium text-fg-subtle">· {option.secondary}</span>
            </>
          ) : null}
        </span>
        {option.count !== undefined ? (
          <span className="text-xs text-fg-subtle">
            {option.count} {option.count === 1 ? "lounge" : "lounges"}
          </span>
        ) : null}
      </button>
    </li>
  );
}
