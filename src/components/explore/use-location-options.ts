"use client";

import * as React from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

import { cityLabel, loungeCountIn, searchCities } from "@/lib/location";
import { isPreciseEnough, type Place } from "@/lib/place-search";

/** Una fila de ManualLocation.dc.html, venga de Google Places o del respaldo local. */
export interface LocationOption {
  id: string;
  main: string;
  secondary: string;
  /** Solo el respaldo local sabe cuántos lounges tiene cada ciudad antes de elegirla. */
  count?: number;
  resolve: () => Promise<Place | null>;
}

const MIN_QUERY = 3;
const DEBOUNCE_MS = 250;

/**
 * Story 2.1 — "Fallback to manual location entry if GPS unavailable".
 * Google Places (API nueva, `AutocompleteSuggestion`, igual que
 * `admin/address-autocomplete.tsx`) propone ciudades, barrios, direcciones y
 * lugares; países y regiones se descartan (`isPreciseEnough`). Si Places no
 * carga (sin red, sin clave, jsdom), se busca en las ciudades de
 * `lib/location.ts` para que el miembro nunca se quede sin salida.
 * Debe vivir dentro de un `APIProvider`.
 */
export function useLocationOptions(
  query: string,
  lounges: { cityId: string }[],
): LocationOption[] {
  const places = useMapsLibrary("places");
  const [remote, setRemote] = React.useState<LocationOption[]>([]);
  const sessionToken = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const searching = places !== null && query.trim().length >= MIN_QUERY;

  React.useEffect(() => {
    if (!places || !searching) return;
    sessionToken.current ??= new places.AutocompleteSessionToken();
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const { suggestions } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionToken.current!,
          });
        if (!active) return;
        setRemote(
          suggestions.flatMap(({ placePrediction: prediction }) => {
            if (!prediction || !isPreciseEnough(prediction.types)) return [];
            const main = prediction.mainText?.text ?? prediction.text.text;
            const secondary = prediction.secondaryText?.text ?? "";
            /** "Newark, NJ" en "Sorted by distance · …", no la dirección entera. */
            const label = secondary ? `${main}, ${secondary.split(",")[0]}` : main;
            return [
              {
                id: prediction.placeId,
                main,
                secondary,
                resolve: async () => {
                  const place = prediction.toPlace();
                  await place.fetchFields({ fields: ["location"] });
                  /** La sesión de autocompletado se cierra (y se cobra) al elegir. */
                  sessionToken.current = null;
                  return place.location
                    ? { label, lat: place.location.lat(), lng: place.location.lng() }
                    : null;
                },
              },
            ];
          }),
        );
      } catch {
        if (active) setRemote([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [places, query, searching]);

  if (places !== null) return searching ? remote : [];

  return searchCities(query).map((city) => ({
    id: city.id,
    main: cityLabel(city),
    secondary: city.country,
    count: loungeCountIn(lounges, city.id),
    resolve: async () => ({ label: cityLabel(city), lat: city.lat, lng: city.lng }),
  }));
}
