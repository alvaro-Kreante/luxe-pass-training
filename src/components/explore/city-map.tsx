"use client";

import * as React from "react";
import { Crosshair, Minus, Plus } from "lucide-react";

import { CityMapBase, MAP_VIEWBOX } from "./city-map-base";
import { SunMark } from "./sun-mark";
import type { Lounge } from "@/lib/lounges";
import { cn } from "@/lib/utils";

/**
 * Story 2.1 — mapa interactivo: ubicación actual, markers de marca, zoom y pan.
 * Artboard: Main.dc.html · DESIGN-SYSTEM.md §5 "Mapa".
 */

/** Zoom 1 es la vista más amplia: el plano ya cubre el área disponible. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

/** Dónde está el miembro en el plano, en coordenadas del viewBox. */
const CURRENT_LOCATION = { x: 267, y: 339 };

function percent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export interface CityMapProps {
  lounges: Lounge[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** El plano se apaga y los markers pierden el dorado (§5 "Mapa"). */
  offline?: boolean;
  /** Lo que se dibuja sobre el mapa: el callout del lounge seleccionado. */
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function CityMap({
  lounges,
  selectedId,
  onSelect,
  offline = false,
  children,
  footer,
}: CityMapProps) {
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{ x: number; y: number } | null>(null);

  const recentre = () => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  };

  const changeZoom = (delta: number) => {
    setZoom((current) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  /** Arrastrar solo tiene sentido cuando el plano desborda su contenedor. */
  const pannable = zoom > MIN_ZOOM;

  const onPointerDown = (event: React.PointerEvent) => {
    if (!pannable) return;
    drag.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    setPan({
      x: event.clientX - drag.current.x,
      y: event.clientY - drag.current.y,
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      className={cn(
        "relative min-h-[320px] flex-1 overflow-hidden bg-map-land",
        pannable && "cursor-grab active:cursor-grabbing",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className={cn("map-canvas", offline && "map-offline")}
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
        }}
      >
        <CityMapBase className="size-full" />

        <span
          className="absolute size-[18px]"
          style={{
            left: percent(CURRENT_LOCATION.x, MAP_VIEWBOX.width),
            top: percent(CURRENT_LOCATION.y, MAP_VIEWBOX.height),
            transform: `translate(-50%, -50%) scale(${1 / zoom})`,
          }}
        >
          <span
            aria-hidden
            className="absolute -left-[13px] -top-[13px] size-11 rounded-full bg-accent/30"
          />
          <span className="absolute inset-0 rounded-full border-[3px] border-white bg-ink-900 shadow-[0_4px_10px_-4px_rgb(34_26_20_/_0.6)]" />
          <span className="absolute left-1/2 top-[34px] -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-white/90 px-2 py-[3px] text-[11px] font-bold text-fg-muted">
            {offline ? "Last known location" : "You are here"}
          </span>
        </span>

        {lounges
          .filter((lounge) => lounge.map)
          .map((lounge) => {
            const selected = lounge.id === selectedId;

            return (
              <button
                key={lounge.id}
                type="button"
                aria-label={`${lounge.name} on the map`}
                aria-pressed={selected}
                onClick={() => onSelect(lounge.id)}
                data-selected={selected}
                className={cn(
                  "map-marker absolute flex cursor-pointer items-center justify-center border-2 border-white",
                  "focus-visible:outline-none focus-visible:shadow-ring",
                  selected
                    ? "size-[46px] border-[2.5px] bg-accent-strong shadow-[0_0_0_7px_rgb(201_168_118_/_0.30),0_10px_22px_-8px_rgb(34_26_20_/_0.65)]"
                    : "size-9 shadow-[0_8px_16px_-6px_rgb(34_26_20_/_0.55)]",
                  offline && !selected ? "bg-ink-400" : "bg-accent",
                )}
                style={{
                  left: percent(lounge.map!.x, MAP_VIEWBOX.width),
                  top: percent(lounge.map!.y, MAP_VIEWBOX.height),
                  transform: `translate(-50%, -50%) rotate(-45deg) scale(${1 / zoom})`,
                }}
              >
                <SunMark
                  size={selected ? 21 : 16}
                  className="rotate-45 text-white"
                />
              </button>
            );
          })}
      </div>

      {children}

      <div className="absolute right-5 top-5 flex flex-col gap-2.5">
        <div className="flex flex-col overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_8px_20px_-12px_rgb(34_26_20_/_0.35)]">
          <MapControl
            label="Zoom in"
            icon={Plus}
            disabled={zoom >= MAX_ZOOM}
            onClick={() => changeZoom(ZOOM_STEP)}
            className="border-b border-line"
          />
          <MapControl
            label="Zoom out"
            icon={Minus}
            disabled={zoom <= MIN_ZOOM}
            onClick={() => changeZoom(-ZOOM_STEP)}
          />
        </div>
        <MapControl
          label="Recentre the map"
          icon={Crosshair}
          onClick={recentre}
          accent
          className="rounded-[11px] border border-line bg-surface shadow-[0_8px_20px_-12px_rgb(34_26_20_/_0.35)]"
        />
      </div>

      {footer}
    </div>
  );
}

function MapControl({
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
