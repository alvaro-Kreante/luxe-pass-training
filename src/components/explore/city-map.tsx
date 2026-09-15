"use client";

import * as React from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Crosshair, Minus, Plus } from "lucide-react";

import { SunMark } from "./sun-mark";
import { useMapLoadStatus } from "./use-map-load-status";
import type { Coordinates } from "@/lib/distance";
import type { LoungeWithDistance } from "@/lib/lounge-directory";
import { cn } from "@/lib/utils";

/**
 * Story 2.1 — mapa real de Google Maps: ubicación actual, markers de marca,
 * zoom y pan. Artboard: Main.dc.html · DESIGN-SYSTEM.md §5 "Mapa" (el
 * proveedor de tiles es real desde esta historia; el estilo/branding del
 * marker y del callout se conservan del mockup, no el plano dibujado).
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID!;

/** Zoom de una vista de barrio con varios lounges cercanos. */
const MIN_ZOOM = 12;
const MAX_ZOOM = 16;
const DEFAULT_ZOOM = MIN_ZOOM;
const ZOOM_STEP = 1;

export type MapLounge = LoungeWithDistance;

export interface CityMapProps {
  lounges: MapLounge[];
  origin: Coordinates;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Dispara cuando el mapa no carga en 3s o el script falla. Debe ser
   * estable (useCallback/useState setter) — si el caller pasa una función
   * inline nueva en cada render, el timeout de useMapLoadStatus se reinicia
   * en cada render y nunca llega a dispararse de verdad. */
  onLoadError: () => void;
  /** El plano se apaga y los markers pierden el dorado (§5 "Mapa"). */
  offline?: boolean;
  /** Lo que se dibuja sobre el mapa: el callout del lounge seleccionado. */
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function CityMap({
  lounges,
  origin,
  selectedId,
  onSelect,
  onLoadError,
  offline = false,
  children,
  footer,
}: CityMapProps) {
  const { handleLoad } = useMapLoadStatus(onLoadError);
  const selected = lounges.find((lounge) => lounge.id === selectedId) ?? null;

  return (
    <div
      className={cn(
        "relative min-h-[320px] flex-1 overflow-hidden bg-map-land",
        offline && "map-offline",
      )}
    >
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        onLoad={handleLoad}
        onError={onLoadError}
      >
        <Map
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={origin}
          defaultZoom={DEFAULT_ZOOM}
          disableDefaultUI
          gestureHandling="greedy"
          className="size-full"
        >
          <CurrentLocationMarker origin={origin} offline={offline} />

          <ClusteredLoungeMarkers
            lounges={lounges}
            selectedId={selectedId}
            offline={offline}
            onSelect={onSelect}
          />

          {selected && children ? (
            <AdvancedMarker
              position={{ lat: selected.lat, lng: selected.lng }}
              zIndex={10}
            >
              {children}
            </AdvancedMarker>
          ) : null}

          <MapControls origin={origin} />
        </Map>
      </APIProvider>

      {footer}
    </div>
  );
}

function CurrentLocationMarker({
  origin,
  offline,
}: {
  origin: Coordinates;
  offline: boolean;
}) {
  return (
    <AdvancedMarker position={origin} zIndex={2}>
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden
          className="absolute -inset-[13px] rounded-full bg-accent/30"
        />
        <span className="relative size-[18px] rounded-full border-[3px] border-white bg-ink-900 shadow-[0_4px_10px_-4px_rgb(34_26_20_/_0.6)]" />
        <span className="mt-2 whitespace-nowrap rounded-[10px] bg-white/90 px-2 py-[3px] text-[11px] font-bold text-fg-muted">
          {offline ? "Last known location" : "You are here"}
        </span>
      </div>
    </AdvancedMarker>
  );
}

function ClusteredLoungeMarkers({
  lounges,
  selectedId,
  offline,
  onSelect,
}: {
  lounges: MapLounge[];
  selectedId: string | undefined;
  offline: boolean;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const markers = React.useRef(
    new globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>(),
  );
  const clusterer = React.useRef<MarkerClusterer | null>(null);

  React.useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({ map });
    return () => {
      clusterer.current?.setMap(null);
      clusterer.current = null;
    };
  }, [map]);

  const loungeIds = lounges.map((lounge) => lounge.id).join(",");

  React.useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers([...markers.current.values()]);
  }, [loungeIds]);

  const setMarkerRef = React.useCallback(
    (id: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
      if (marker) markers.current.set(id, marker);
      else markers.current.delete(id);
    },
    [],
  );

  return (
    <>
      {lounges.map((lounge) => (
        <LoungeMarker
          key={lounge.id}
          lounge={lounge}
          selected={lounge.id === selectedId}
          offline={offline}
          onSelect={onSelect}
          markerRef={(marker) => setMarkerRef(lounge.id, marker)}
        />
      ))}
    </>
  );
}

function LoungeMarker({
  lounge,
  selected,
  offline,
  onSelect,
  markerRef,
}: {
  lounge: MapLounge;
  selected: boolean;
  offline: boolean;
  onSelect: (id: string) => void;
  markerRef?: (marker: google.maps.marker.AdvancedMarkerElement | null) => void;
}) {
  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: lounge.lat, lng: lounge.lng }}
      onClick={() => onSelect(lounge.id)}
      zIndex={selected ? 5 : 1}
    >
      <button
        type="button"
        aria-label={`${lounge.name} on the map`}
        aria-pressed={selected}
        data-selected={selected}
        className={cn(
          "map-marker flex rotate-[-45deg] cursor-pointer items-center justify-center border-2 border-white",
          "focus-visible:outline-none focus-visible:shadow-ring",
          selected
            ? "size-[46px] border-[2.5px] bg-accent-strong shadow-[0_0_0_7px_rgb(201_168_118_/_0.30),0_10px_22px_-8px_rgb(34_26_20_/_0.65)]"
            : "size-9 shadow-[0_8px_16px_-6px_rgb(34_26_20_/_0.55)]",
          offline && !selected ? "bg-ink-400" : "bg-accent",
        )}
      >
        <SunMark size={selected ? 21 : 16} className="rotate-45 text-white" />
      </button>
    </AdvancedMarker>
  );
}

function MapControls({ origin }: { origin: Coordinates }) {
  const map = useMap();

  /**
   * El zoom real vive en el SDK de Google Maps, fuera de React — es el caso
   * "external sync" que el propio mensaje de la regla eslint
   * `react-hooks/set-state-in-effect` remite a `useSyncExternalStore`. A
   * diferencia de un `useState` + `useEffect(() => setZoom(map.getZoom()))`,
   * `getSnapshot` se lee en cada render (incluido el primero en que `map`
   * deja de ser `null`), así que no hay hueco entre que el mapa está listo y
   * que el botón "Zoom out" refleja su zoom real.
   */
  const subscribeToZoom = React.useCallback(
    (onStoreChange: () => void) => {
      if (!map) return () => {};
      const listener = map.addListener("zoom_changed", onStoreChange);
      return () => listener.remove();
    },
    [map],
  );
  const getZoomSnapshot = React.useCallback(
    () => map?.getZoom() ?? DEFAULT_ZOOM,
    [map],
  );
  const getZoomServerSnapshot = React.useCallback(() => DEFAULT_ZOOM, []);
  const zoom = React.useSyncExternalStore(
    subscribeToZoom,
    getZoomSnapshot,
    getZoomServerSnapshot,
  );

  const changeZoom = (delta: number) => {
    if (!map) return;
    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, (map.getZoom() ?? DEFAULT_ZOOM) + delta),
    );
    map.setZoom(next);
  };

  const recentre = () => {
    if (!map) return;
    map.panTo(origin);
    map.setZoom(DEFAULT_ZOOM);
  };

  return (
    <div className="absolute right-5 top-5 flex flex-col gap-2.5">
      <div className="flex flex-col overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_8px_20px_-12px_rgb(34_26_20_/_0.35)]">
        <MapControlButton
          label="Zoom in"
          icon={Plus}
          disabled={zoom >= MAX_ZOOM}
          onClick={() => changeZoom(ZOOM_STEP)}
          className="border-b border-line"
        />
        <MapControlButton
          label="Zoom out"
          icon={Minus}
          disabled={zoom <= MIN_ZOOM}
          onClick={() => changeZoom(-ZOOM_STEP)}
        />
      </div>
      <MapControlButton
        label="Recentre the map"
        icon={Crosshair}
        onClick={recentre}
        accent
        className="rounded-[11px] border border-line bg-surface shadow-[0_8px_20px_-12px_rgb(34_26_20_/_0.35)]"
      />
    </div>
  );
}

function MapControlButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  accent,
  className,
}: {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-[42px] cursor-pointer items-center justify-center bg-surface",
        "transition-colors duration-150 hover:bg-accent-soft",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface",
        "focus-visible:outline-none focus-visible:shadow-ring",
        className,
      )}
    >
      <Icon
        size={accent ? 19 : 18}
        strokeWidth={1.8}
        className={accent ? "text-accent-strong" : "text-fg-muted"}
      />
    </button>
  );
}
