"use client";

import * as React from "react";
import { AdvancedMarker, APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { LoungeLocation } from "@/lib/lounge-draft";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID!;

/**
 * Story 8.3 — "Location" del alta de un lounge (LoungeNew.dc.html, 14).
 * Google Places (API nueva, `AutocompleteSuggestion`) propone direcciones;
 * elegir una rellena dirección, barrio, ciudad y coordenadas, y el pin del
 * mini-mapa se puede arrastrar hasta la entrada. Proveedor único de mapa
 * (CLAUDE.md): `@vis.gl/react-google-maps`.
 */
export function AddressAutocomplete({
  value,
  onChange,
}: {
  value: LoungeLocation | null;
  onChange: (location: LoungeLocation | null) => void;
}) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <AddressAutocompleteInner value={value} onChange={onChange} />
    </APIProvider>
  );
}

interface Suggestion {
  id: string;
  main: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

function component(components: google.maps.places.AddressComponent[], ...types: string[]): string {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match?.longText) return match.longText;
  }
  return "";
}

function AddressAutocompleteInner({
  value,
  onChange,
}: {
  value: LoungeLocation | null;
  onChange: (location: LoungeLocation | null) => void;
}) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = React.useState(value?.address ?? "");
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [highlighted, setHighlighted] = React.useState(0);
  const sessionToken = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const searching = places !== null && query.trim().length >= 3 && query !== value?.address;

  React.useEffect(() => {
    if (!places || !searching) return;
    sessionToken.current ??= new places.AutocompleteSessionToken();
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionToken.current!,
        });
        if (!active) return;
        setSuggestions(
          results.flatMap((result) =>
            result.placePrediction
              ? [
                  {
                    id: result.placePrediction.placeId,
                    main: result.placePrediction.mainText?.text ?? result.placePrediction.text.text,
                    secondary: result.placePrediction.secondaryText?.text ?? "",
                    prediction: result.placePrediction,
                  },
                ]
              : [],
          ),
        );
        setHighlighted(0);
      } catch {
        if (active) setSuggestions([]);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [places, query, searching]);

  async function pick(suggestion: Suggestion) {
    const place = suggestion.prediction.toPlace();
    await place.fetchFields({ fields: ["location", "addressComponents"] });
    sessionToken.current = null;
    setSuggestions([]);
    setQuery(suggestion.main);
    const components = place.addressComponents ?? [];
    const location = place.location;
    if (!location) return;
    onChange({
      address: suggestion.main,
      neighborhood: component(components, "neighborhood", "sublocality_level_1", "sublocality"),
      city: component(components, "locality", "postal_town", "sublocality_level_1", "administrative_area_level_2"),
      lat: Number(location.lat().toFixed(6)),
      lng: Number(location.lng().toFixed(6)),
    });
  }

  const visible = searching ? suggestions : [];

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visible.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => Math.min(i + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      void pick(visible[highlighted]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          <Input
            aria-label="Address"
            role="combobox"
            aria-expanded={visible.length > 0}
            aria-controls="address-suggestions"
            aria-autocomplete="list"
            inputSize="compact"
            icon={<MapPin size={17} strokeWidth={1.8} className="text-accent" />}
            placeholder="Start typing the street address"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (value) onChange(null);
            }}
            onKeyDown={onKeyDown}
          />
          {visible.length > 0 ? (
            <ul
              id="address-suggestions"
              role="listbox"
              aria-label="Address suggestions"
              className="absolute inset-x-0 top-[calc(100%+8px)] z-10 m-0 list-none rounded-2xl border border-line bg-dark-card p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
            >
              {visible.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  role="option"
                  aria-selected={index === highlighted}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void pick(suggestion)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover",
                    index === highlighted && "bg-surface-hover",
                  )}
                >
                  <MapPin size={15} strokeWidth={1.8} className={index === highlighted ? "text-accent" : "text-fg-subtle"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-fg">{suggestion.main}</span>
                    <span className="mt-0.5 block text-[11.5px] text-fg-subtle">{suggestion.secondary}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="relative aspect-[600/304] w-full overflow-hidden lg:w-[430px] lg:shrink-0 rounded-2xl border border-line bg-panel-black">
          {value ? (
            <>
              <Map
                mapId={GOOGLE_MAPS_MAP_ID}
                defaultCenter={{ lat: value.lat, lng: value.lng }}
                defaultZoom={16}
                disableDefaultUI
                gestureHandling="cooperative"
                className="size-full"
              >
                <RecentreOn lat={value.lat} lng={value.lng} />
                <AdvancedMarker
                  position={{ lat: value.lat, lng: value.lng }}
                  draggable
                  onDragEnd={(event) => {
                    const latLng = event.latLng;
                    if (!latLng) return;
                    onChange({ ...value, lat: Number(latLng.lat().toFixed(6)), lng: Number(latLng.lng().toFixed(6)) });
                  }}
                />
              </Map>
              <span className="pointer-events-none absolute bottom-2 left-2.5 rounded-lg bg-panel-black/85 px-2 py-1 text-[10.5px] font-bold text-fg-muted">
                Drag the pin to the entrance
              </span>
            </>
          ) : (
            <p className="m-0 flex size-full items-center justify-center px-6 text-center text-[11.5px] text-fg-subtle">
              Pick an address to place the pin
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentreOn({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  React.useEffect(() => {
    map?.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}

/**
 * Epic 8 · LoungeLive.dc.html (17) — la ubicación de un lounge live: la
 * misma dirección y el mismo mapa, sin búsqueda ni pin arrastrable (solo se
 * edita en borrador).
 */
export function LoungeLocationPreview({ value }: { value: LoungeLocation }) {
  return (
    <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 py-3">
        <MapPin size={17} strokeWidth={1.8} className="shrink-0 text-accent" />
        <span className="text-[13.5px] text-fg">
          {[value.address, value.neighborhood, value.city].filter(Boolean).join(", ")}
        </span>
      </div>
      <div className="relative aspect-[600/304] w-full overflow-hidden rounded-2xl border border-line bg-panel-black lg:w-[430px] lg:shrink-0">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            mapId={GOOGLE_MAPS_MAP_ID}
            defaultCenter={{ lat: value.lat, lng: value.lng }}
            defaultZoom={16}
            disableDefaultUI
            gestureHandling="cooperative"
            className="size-full"
          >
            <AdvancedMarker position={{ lat: value.lat, lng: value.lng }} />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
