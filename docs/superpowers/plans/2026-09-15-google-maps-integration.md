# Google Maps Integration (Story 2.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el mapa SVG mockup de `/explore` (Story 2.1) por Google Maps real (`@vis.gl/react-google-maps` + `@googlemaps/markerclusterer`), usando las `lat`/`lng` reales que ya existen en `public.lounges`, conservando el contrato público de `CityMap` y el patrón visual "pin → callout encima del mapa".

**Architecture:** `CityMap` sigue siendo el único punto de entrada (mismas props externas), pero por dentro monta `<APIProvider>` → `<Map mapId={...}>` → `<AdvancedMarker>` por lounge + un `<AdvancedMarker>` extra para el callout seleccionado. Se elimina `city-map-base.tsx` (SVG) y `lounge-map-positions.ts` (posiciones de píxel). Los estados de error/offline dejan de simularse por query param: el timeout de carga (3s) y `onError` del `APIProvider` viven en un hook propio y testeable (`useMapLoadStatus`); el offline usa `navigator.onLine` real (`useOnlineStatus`). El SDK de Google Maps no puede correr en jsdom, así que se rellena `window.google.maps` en `vitest.setup.ts` con un stub mínimo y determinista — mismo precedente que el `IntersectionObserver` inerte ya existente ahí.

**Tech Stack:** Next.js 15 · React 19 · TypeScript · `@vis.gl/react-google-maps` · `@googlemaps/markerclusterer` · Vitest + Testing Library · Playwright (verificación visual puntual)

**Spec:** `docs/superpowers/specs/2026-09-15-google-maps-integration-design.md`

---

## Task 1: Instalar dependencias

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar**

```bash
npm install @vis.gl/react-google-maps @googlemaps/markerclusterer
npm install -D @types/google.maps
```

`@types/google.maps` da los tipos del namespace global `google.maps.*`
(`google.maps.Map`, `google.maps.marker.AdvancedMarkerElement`, etc.) que
`useMap()` y el clustering de la Tarea 9 necesitan para que `tsc` los
resuelva — `@vis.gl/react-google-maps` no los reexporta por su cuenta.

- [ ] **Step 2: Verificar que no rompe nada existente**

```bash
npx tsc --noEmit
npm test
```

Expected: ambos en verde (todavía no se usó nada de las librerías nuevas).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Google Maps dependencies (@vis.gl/react-google-maps, @googlemaps/markerclusterer)"
```

---

## Task 2: Hook `useOnlineStatus`

**Files:**
- Create: `src/lib/online-status.ts`
- Test: `src/lib/online-status.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/online-status.test.ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useOnlineStatus } from "./online-status";

describe("useOnlineStatus", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("empieza en línea cuando el navegador lo está", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it("empieza desconectado si el navegador ya lo estaba al montar", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it("pasa a desconectado cuando el navegador dispara 'offline'", () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("vuelve a conectado cuando el navegador dispara 'online'", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx vitest run src/lib/online-status.test.ts
```

Expected: FAIL — `Cannot find module './online-status'`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/online-status.ts
"use client";

import * as React from "react";

/**
 * Story 2.1 — "Offline mode shows cached nearby locations", con la condición
 * real (`navigator.onLine` + eventos `online`/`offline`) en vez del query
 * param `?offline=1` simulado que usaba /explore antes del proveedor real.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  React.useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

```bash
npx vitest run src/lib/online-status.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/online-status.ts src/lib/online-status.test.ts
git commit -m "feat: add useOnlineStatus hook for real offline detection"
```

---

## Task 3: Reemplazar `?offline=1` por detección real en `/explore`

**Files:**
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/explore/page.test.tsx`

- [ ] **Step 1: Reescribir el describe "modo offline" en el test (rojo)**

En `src/app/explore/page.test.tsx`, reemplazar el bloque `describe("modo offline", ...)` (líneas 304-323) por:

```ts
describe("modo offline", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("avisa de que los lounges vienen de la última visita", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<ExplorePage />);

    expect(await screen.findByText("You're offline")).toBeInTheDocument();
    expect(
      await within(resultsPanel()).findByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("deshabilita la búsqueda, que necesita conexión", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    render(<ExplorePage />);

    expect(await screen.findByLabelText("Search lounges")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx vitest run src/app/explore/page.test.tsx -t "modo offline"
```

Expected: FAIL — `page.tsx` todavía deriva `offline` de `params.get("offline")`, no de `navigator.onLine`, así que el banner nunca aparece.

- [ ] **Step 3: Actualizar `page.tsx`**

Importar el hook (junto a los demás imports de `@/lib`, tras la línea `import { getCurrentPosition, ... } from "@/lib/geolocation";`):

```ts
import { useOnlineStatus } from "@/lib/online-status";
```

Reemplazar (líneas 82-90):

```ts
function ExploreScreen() {
  const params = useSearchParams();
  const offline = params.get("offline") === "1";
  const startsWithMapError = params.get("map") === "error";

  /** Los estados de borde entran con la ubicación ya resuelta, como el artboard. */
  const [step, setStep] = React.useState<LocationStep>(
    offline || startsWithMapError ? "located" : "asking",
  );
```

por:

```ts
function ExploreScreen() {
  const params = useSearchParams();
  const online = useOnlineStatus();
  const offline = !online;
  const startsWithMapError = params.get("map") === "error";

  /** Un miembro que vuelve sin conexión ya dio su ubicación antes: se salta el permiso. */
  const [step, setStep] = React.useState<LocationStep>(
    offline || startsWithMapError ? "located" : "asking",
  );
```

`startsWithMapError`/`mapFailed` se tocan en la Tarea 8 — no antes, para no romper "el mapa no carga" a mitad de esta tarea.

- [ ] **Step 4: Ejecutar y ver que pasa**

```bash
npx vitest run src/app/explore/page.test.tsx
```

Expected: PASS — toda la suite del archivo, incluido "modo offline" y también "el mapa no carga" (que sigue igual, sin tocar todavía).

- [ ] **Step 5: Commit**

```bash
git add src/app/explore/page.tsx src/app/explore/page.test.tsx
git commit -m "feat: replace ?offline=1 with real navigator.onLine detection"
```

---

## Task 4: Hook `useMapLoadStatus` (timeout de carga + error real)

Se extrae primero, aislado de Google Maps por completo, para poder testear el
timeout de 3s con fake timers sin depender del stub de `window.google.maps`
(eso llega en la Tarea 5).

**Files:**
- Create: `src/components/explore/use-map-load-status.ts`
- Test: `src/components/explore/use-map-load-status.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/components/explore/use-map-load-status.test.tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMapLoadStatus } from "./use-map-load-status";

function Harness({ onLoadError }: { onLoadError: () => void }) {
  const { handleLoad } = useMapLoadStatus(onLoadError, 3000);
  return (
    <button type="button" onClick={handleLoad}>
      simulate load
    </button>
  );
}

describe("useMapLoadStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("llama a onLoadError si no carga en el tiempo dado", async () => {
    vi.useFakeTimers();
    const onLoadError = vi.fn();
    render(<Harness onLoadError={onLoadError} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onLoadError).toHaveBeenCalledOnce();
  });

  it("no llama a onLoadError si carga antes del tiempo dado", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    const onLoadError = vi.fn();
    render(<Harness onLoadError={onLoadError} />);

    await user.click(screen.getByRole("button", { name: "simulate load" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onLoadError).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx vitest run src/components/explore/use-map-load-status.test.tsx
```

Expected: FAIL — `Cannot find module './use-map-load-status'`.

- [ ] **Step 3: Implementar**

```ts
// src/components/explore/use-map-load-status.ts
"use client";

import * as React from "react";

/**
 * Story 2.1 — "Map loads within 3 seconds on good connection". Antes se
 * simulaba con `?map=error`; ahora mide de verdad: si `handleLoad` (cableado
 * al `onLoad` del `APIProvider`) no se llama a tiempo, dispara `onLoadError`.
 * `onLoadError` también se cablea directo al `onError` del `APIProvider`
 * para un fallo inmediato del script, sin esperar el timeout.
 */
export function useMapLoadStatus(onLoadError: () => void, timeoutMs = 3000) {
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) onLoadError();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [onLoadError, timeoutMs]);

  const handleLoad = React.useCallback(() => {
    loadedRef.current = true;
  }, []);

  return { handleLoad };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

```bash
npx vitest run src/components/explore/use-map-load-status.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/use-map-load-status.ts src/components/explore/use-map-load-status.test.tsx
git commit -m "feat: add useMapLoadStatus hook for real 3s map-load timeout"
```

---

## Task 5: Stub de `window.google.maps` + primer render de `CityMap` con pines reales

Esta es la tarea más grande del plan: aquí se construye el stub de Google Maps
y se reescribe el núcleo de `CityMap`. Se avanza en pasos pequeños; si al
ejecutar un test aparece un error **distinto** al `Expected` de ese paso
(p. ej. `@vis.gl/react-google-maps` llama a un método del stub que no existe
todavía), es señal de que falta ampliar el stub — se añade el método/propiedad
que pide el error y se reintenta. Es el mismo ciclo rojo-verde de TDD aplicado
al propio stub, no un atajo.

**Files:**
- Create: `src/components/explore/city-map.test.tsx`
- Modify: `vitest.setup.ts`
- Modify: `src/components/explore/city-map.tsx` (reescritura completa)
- Delete: `src/components/explore/city-map-base.tsx`
- Delete: `src/components/explore/lounge-map-positions.ts`
- Modify: `src/app/explore/page.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/components/explore/city-map.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CityMap } from "./city-map";

const LOUNGES = [
  {
    id: "the-ainsworth",
    name: "The Ainsworth",
    neighborhood: "Midtown",
    city: "New York",
    cityId: "new-york",
    lat: 40.7549,
    lng: -73.984,
    amenities: [],
    rating: 4.8,
    openNow: true,
    slotsToday: 3,
    hours: "8am–10pm",
    bands: [],
    closedWeekdays: [],
    featured: true,
    distanceMiles: 0.3,
  },
  {
    id: "belmont-terrace",
    name: "Belmont Terrace",
    neighborhood: "Chelsea",
    city: "New York",
    cityId: "new-york",
    lat: 40.7465,
    lng: -74.0014,
    amenities: [],
    rating: 4.6,
    openNow: true,
    slotsToday: 0,
    hours: "8am–10pm",
    bands: [],
    closedWeekdays: [],
    featured: false,
    distanceMiles: 1.1,
  },
];

describe("CityMap", () => {
  it("pone un marker por cada lounge, con su lat/lng real", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={vi.fn()}
        onLoadError={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "The Ainsworth on the map" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Belmont Terrace on the map" }),
    ).toBeInTheDocument();
  });

  it("sitúa al miembro en su ubicación real", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={vi.fn()}
        onLoadError={vi.fn()}
      />,
    );

    expect(await screen.findByText("You are here")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx vitest run src/components/explore/city-map.test.tsx
```

Expected: FAIL — `CityMap` todavía tiene la firma vieja (sin `origin`/`onLoadError`, con SVG), o revienta porque `@vis.gl/react-google-maps` no encuentra `window.google`.

- [ ] **Step 3: Añadir el stub a `vitest.setup.ts`**

Añadir al final del archivo:

```ts
/**
 * Stub mínimo y determinista de `window.google.maps` (Story 2.1, integración
 * con @vis.gl/react-google-maps). No sustituye código del proyecto: rellena
 * el global que un <script> real de Google inyectaría, mismo precedente que
 * IntersectionObserver arriba. `APIProvider` detecta que `window.google.maps`
 * ya existe y no intenta tocar la red.
 *
 * `content` de un AdvancedMarkerElement se apoya siempre en un nodo real ya
 * insertado en el documento (el `div` del mapa, que sí forma parte del árbol
 * de React) — así los queries de Testing Library lo encuentran igual que
 * encontrarían un marker real.
 */
class StubLatLng {
  constructor(
    public lat: number,
    public lng: number,
  ) {}
}

class StubMapCanvas {
  zoom: number;
  center: StubLatLng;
  private listeners: Record<string, Array<() => void>> = {};

  constructor(
    public div: HTMLElement,
    options: { zoom?: number; center?: { lat: number; lng: number } } = {},
  ) {
    this.zoom = options.zoom ?? 0;
    this.center = new StubLatLng(
      options.center?.lat ?? 0,
      options.center?.lng ?? 0,
    );
  }

  setOptions(options: { zoom?: number; center?: { lat: number; lng: number } }) {
    if (options.zoom !== undefined) this.setZoom(options.zoom);
    if (options.center) this.panTo(options.center);
  }

  getZoom() {
    return this.zoom;
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
    this.emit("zoom_changed");
  }

  getCenter() {
    return this.center;
  }

  panTo(position: { lat: number; lng: number }) {
    this.center = new StubLatLng(position.lat, position.lng);
    this.emit("center_changed");
  }

  addListener(event: string, callback: () => void) {
    (this.listeners[event] ??= []).push(callback);
    return {
      remove: () => {
        this.listeners[event] = (this.listeners[event] ?? []).filter(
          (listener) => listener !== callback,
        );
      },
    };
  }

  private emit(event: string) {
    for (const callback of this.listeners[event] ?? []) callback();
  }
}

class StubAdvancedMarkerElement extends EventTarget {
  #map: StubMapCanvas | null = null;
  #content: HTMLElement | null = null;
  position: { lat: number; lng: number } | null = null;
  zIndex: number | null = null;

  constructor(
    options: Partial<{
      map: StubMapCanvas;
      position: { lat: number; lng: number };
      content: HTMLElement;
      zIndex: number;
    }> = {},
  ) {
    super();
    if (options.position) this.position = options.position;
    if (options.zIndex !== undefined) this.zIndex = options.zIndex;
    if (options.content) this.content = options.content;
    if (options.map) this.map = options.map;
  }

  get map() {
    return this.#map;
  }

  set map(value: StubMapCanvas | null) {
    this.#content?.remove();
    this.#map = value;
    if (this.#map && this.#content) this.#map.div.appendChild(this.#content);
  }

  get content() {
    return this.#content;
  }

  set content(value: HTMLElement | null) {
    this.#content?.remove();
    this.#content = value;
    if (this.#map && this.#content) this.#map.div.appendChild(this.#content);
    this.#content?.addEventListener("click", () => {
      this.dispatchEvent(new Event("gmp-click"));
    });
  }
}

Object.defineProperty(globalThis, "google", {
  writable: true,
  configurable: true,
  value: {
    maps: {
      Map: StubMapCanvas,
      LatLng: StubLatLng,
      marker: {
        AdvancedMarkerElement: StubAdvancedMarkerElement,
      },
      event: {
        clearInstanceListeners: () => {},
      },
      importLibrary: async (name: string) => {
        if (name === "marker") {
          return { AdvancedMarkerElement: StubAdvancedMarkerElement };
        }
        if (name === "maps") {
          return { Map: StubMapCanvas };
        }
        return {};
      },
    },
  },
});

/** Los tests no dependen de la key/Map ID reales de `.env.local`. */
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??= "test-key";
process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ??= "test-map-id";
```

- [ ] **Step 4: Reescribir `city-map.tsx`**

Eliminar `src/components/explore/city-map-base.tsx` y
`src/components/explore/lounge-map-positions.ts`:

```bash
git rm src/components/explore/city-map-base.tsx src/components/explore/lounge-map-positions.ts
```

Reemplazar el contenido completo de `src/components/explore/city-map.tsx` por
(los controles de zoom/recentrado llegan en la Tarea 7 — por ahora
`MapControls` es un placeholder vacío para no romper el layout):

```tsx
"use client";

import * as React from "react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";

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

export type MapLounge = LoungeWithDistance;

export interface CityMapProps {
  lounges: MapLounge[];
  origin: Coordinates;
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Dispara cuando el mapa no carga en 3s o el script falla. */
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

          {lounges.map((lounge) => (
            <LoungeMarker
              key={lounge.id}
              lounge={lounge}
              selected={lounge.id === selectedId}
              offline={offline}
              onSelect={onSelect}
            />
          ))}

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

function LoungeMarker({
  lounge,
  selected,
  offline,
  onSelect,
}: {
  lounge: MapLounge;
  selected: boolean;
  offline: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <AdvancedMarker
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
  // Se implementa en la Tarea 7 — placeholder para no romper el layout.
  return null;
}
```

- [ ] **Step 5: Actualizar `page.tsx` para el nuevo contrato**

Quitar el import de `LOUNGE_MAP_POSITIONS` (línea 23):

```ts
import { LOUNGE_MAP_POSITIONS } from "@/components/explore/lounge-map-positions";
```

Reemplazar la composición de `lounges` (líneas 125-128):

```ts
  const lounges = filtered.map((lounge) => ({
    ...lounge,
    map: LOUNGE_MAP_POSITIONS[lounge.id],
  }));
```

por:

```ts
  const lounges = filtered;
```

Y en el render de `<CityMap>` (líneas 305-313), añadir `origin` y un
`onLoadError` temporal (se cablea de verdad a `mapFailed` en la Tarea 8):

```tsx
            <CityMap
              lounges={lounges}
              origin={origin}
              selectedId={selectedId ?? undefined}
              onSelect={setSelectedId}
              onLoadError={() => {}}
              offline={offline}
              footer={<MapFooter unit={unit} offline={offline} />}
            >
              {selected ? <LoungeCallout lounge={selected} unit={unit} /> : null}
            </CityMap>
```

- [ ] **Step 6: Ejecutar el test nuevo**

```bash
npx vitest run src/components/explore/city-map.test.tsx
```

Expected: PASS (2 tests). Si falla con un error de `@vis.gl/react-google-maps`
sobre un método/propiedad del stub que falta, añadirlo al stub del Step 3
(siguiendo el mensaje de error exacto) y repetir este step.

- [ ] **Step 7: Ejecutar la suite completa de `/explore`**

```bash
npx vitest run src/app/explore/page.test.tsx
```

Expected: fallan por ahora "selección de un lounge" y "zoom del mapa" (el
callout y los controles de zoom llegan en las Tareas 6 y 7) — es un rojo
esperado a mitad de refactor grande, no una regresión a arreglar aquí.

- [ ] **Step 8: Commit**

```bash
git add vitest.setup.ts src/components/explore/city-map.tsx src/components/explore/city-map.test.tsx src/app/explore/page.tsx
git rm src/components/explore/city-map-base.tsx src/components/explore/lounge-map-positions.ts
git commit -m "feat: render CityMap markers on real Google Maps with real lat/lng"
```

---

## Task 6: Selección y callout como `AdvancedMarker`

**Files:**
- Modify: `src/components/explore/city-map.test.tsx`
- Modify: `src/components/explore/lounge-callout.tsx`
- Modify: `src/app/explore/page.test.tsx`

- [ ] **Step 1: Extender el test de `CityMap` (rojo)**

Añadir a `city-map.test.tsx`:

```tsx
describe("selección", () => {
  it("llama a onSelect al hacer clic en un marker", async () => {
    const onSelect = vi.fn();
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={onSelect}
        onLoadError={vi.fn()}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "The Ainsworth on the map" }),
    );

    expect(onSelect).toHaveBeenCalledWith("the-ainsworth");
  });

  it("dibuja los children (callout) sobre el lounge seleccionado", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        selectedId="the-ainsworth"
        onSelect={vi.fn()}
        onLoadError={vi.fn()}
      >
        <div role="group" aria-label="Selected lounge">
          The Ainsworth detail
        </div>
      </CityMap>,
    );

    expect(
      await screen.findByRole("group", { name: "Selected lounge" }),
    ).toHaveTextContent("The Ainsworth detail");
  });
});
```

Añadir el import de `userEvent` al principio del archivo:

```ts
import userEvent from "@testing-library/user-event";
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx vitest run src/components/explore/city-map.test.tsx
```

Expected: el primer test probablemente ya pasa (el `onClick` del marker ya
está cableado desde la Tarea 5); el segundo también debería pasar ya, porque
el `AdvancedMarker` del callout seleccionado ya se escribió en la Tarea 5. Si
ambos pasan, seguir al Step 3 igual (confirma el contrato antes de tocar
`lounge-callout.tsx`).

- [ ] **Step 3: Quitar el cálculo de posición de `LoungeCallout`**

Reemplazar el contenido completo de `src/components/explore/lounge-callout.tsx`:

```tsx
"use client";

import Link from "next/link";

import { LoungeThumb } from "@/components/lounges/lounge-thumb";
import { Rating } from "@/components/ui/rating";
import { StatusChip } from "@/components/ui/status-chip";
import { availabilityLabel } from "@/lib/availability";
import {
  formatDistance,
  walkingMinutes,
  type DistanceUnit,
} from "@/lib/distance";
import type { MapLounge } from "./city-map";

/**
 * Callout del lounge seleccionado sobre el mapa (Main.dc.html): card de
 * 302px. Antes se anclaba en % del viewBox del SVG; ahora lo posiciona el
 * `AdvancedMarker` que lo envuelve (mismas coordenadas lat/lng del pin), así
 * que este componente ya no calcula su propia posición.
 */
export function LoungeCallout({
  lounge,
  unit,
}: {
  lounge: MapLounge;
  unit: DistanceUnit;
}) {
  return (
    <div
      role="group"
      aria-label="Selected lounge"
      className="absolute bottom-full left-1/2 z-10 mb-4 w-[302px] max-w-[calc(100vw-40px)] -translate-x-1/2 overflow-hidden rounded-content bg-surface shadow-[0_24px_50px_-18px_rgb(34_26_20_/_0.40)]"
    >
      <div className="flex gap-3 px-3.5 pb-2.5 pt-3.5">
        <LoungeThumb
          loungeId={lounge.id}
          className="size-[74px] rounded-control"
        />

        <div className="min-w-0 flex-1">
          <p className="m-0 mb-1 text-[15.5px] font-bold text-fg">
            {lounge.name}
          </p>
          <p className="m-0 mb-2 text-xs text-fg-subtle">
            {lounge.neighborhood} · {formatDistance(lounge.distanceMiles, unit)} ·{" "}
            {walkingMinutes(lounge.distanceMiles)} min walk
          </p>
          <div className="flex items-center gap-2">
            <Rating value={lounge.rating} />
            <StatusChip size="sm" available={lounge.slotsToday > 0}>
              {availabilityLabel(lounge)}
            </StatusChip>
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-3.5">
        <Link
          href={`/lounges/${lounge.id}`}
          className="flex h-11 w-full items-center justify-center rounded-[11px] bg-accent text-[12.5px] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors duration-150 hover:bg-accent-strong hover:text-on-accent"
        >
          View details
        </Link>
      </div>
    </div>
  );
}
```

(`bottom-full` + `-translate-x-1/2` centra el callout justo encima del pin,
en vez del flip izquierda/derecha del mock atado al viewBox del SVG — se
documenta como desviación consciente en la Tarea 11.)

- [ ] **Step 4: Ejecutar los tests de `CityMap` y de `/explore`**

```bash
npx vitest run src/components/explore/city-map.test.tsx
npx vitest run src/app/explore/page.test.tsx -t "selección de un lounge"
```

Expected: PASS en ambos.

- [ ] **Step 5: Commit**

```bash
git add src/components/explore/city-map.test.tsx src/components/explore/lounge-callout.tsx
git commit -m "feat: anchor lounge callout to its AdvancedMarker instead of SVG viewBox"
```

---

## Task 7: Controles de zoom y recentrado con `useMap()`

**Files:**
- Modify: `src/components/explore/city-map.tsx`
- Modify: `src/components/explore/city-map.test.tsx`

- [ ] **Step 1: Extender el test (rojo)**

Añadir a `city-map.test.tsx`:

```tsx
describe("controles de zoom", () => {
  it("empieza con 'Zoom out' deshabilitado en la vista más amplia", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={vi.fn()}
        onLoadError={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "Zoom out" }),
    ).toBeDisabled();
  });

  it("habilita 'Zoom out' tras un 'Zoom in'", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={vi.fn()}
        onLoadError={vi.fn()}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Zoom in" }),
    );

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
npx vitest run src/components/explore/city-map.test.tsx
```

Expected: FAIL — `MapControls` todavía es un placeholder que no renderiza
nada (`Unable to find role="button" name="Zoom out"`).

- [ ] **Step 3: Implementar `MapControls`**

En `src/components/explore/city-map.tsx`, añadir el import:

```ts
import { Crosshair, Minus, Plus } from "lucide-react";
```

y `useMap` al import existente de `@vis.gl/react-google-maps`:

```ts
import { APIProvider, AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
```

Añadir la constante junto a las otras:

```ts
const ZOOM_STEP = 1;
```

Reemplazar el placeholder del Step 8 de la Tarea 5:

```tsx
function MapControls({ origin }: { origin: Coordinates }) {
  // Se implementa en la Tarea 7 — placeholder para no romper el layout.
  return null;
}
```

por:

```tsx
function MapControls({ origin }: { origin: Coordinates }) {
  const map = useMap();
  const [zoom, setZoomState] = React.useState(DEFAULT_ZOOM);

  React.useEffect(() => {
    if (!map) return;

    setZoomState(map.getZoom() ?? DEFAULT_ZOOM);
    const listener = map.addListener("zoom_changed", () => {
      setZoomState(map.getZoom() ?? DEFAULT_ZOOM);
    });

    return () => listener.remove();
  }, [map]);

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
```

- [ ] **Step 4: Ejecutar y ver que pasa**

```bash
npx vitest run src/components/explore/city-map.test.tsx
npx vitest run src/app/explore/page.test.tsx -t "zoom del mapa"
```

Expected: PASS en ambos.

- [ ] **Step 5: Suite completa de `/explore`**

```bash
npx vitest run src/app/explore/page.test.tsx
```

Expected: todo en verde salvo "el mapa no carga" (Tarea 8, todavía usa el
query param viejo que ya no existe en la lógica).

- [ ] **Step 6: Commit**

```bash
git add src/components/explore/city-map.tsx src/components/explore/city-map.test.tsx
git commit -m "feat: wire zoom/recentre controls to the real Google Map instance"
```

---

## Task 8: Conectar `onLoadError` real y quitar `?map=error`

**Files:**
- Modify: `src/app/explore/page.tsx`
- Modify: `src/app/explore/page.test.tsx`

- [ ] **Step 1: Actualizar `page.tsx`**

Quitar `startsWithMapError` y `mapFailed` de la inicialización por query
param. Reemplazar (líneas 82-99):

```ts
function ExploreScreen() {
  const params = useSearchParams();
  const online = useOnlineStatus();
  const offline = !online;
  const startsWithMapError = params.get("map") === "error";

  /** Un miembro que vuelve sin conexión ya dio su ubicación antes: se salta el permiso. */
  const [step, setStep] = React.useState<LocationStep>(
    offline || startsWithMapError ? "located" : "asking",
  );
  const [cityId, setCityId] = React.useState(DEFAULT_CITY_ID);
  const [origin, setOrigin] = React.useState(() => {
    const city = cityById(DEFAULT_CITY_ID);
    return { lat: city.lat, lng: city.lng };
  });
  const [allLounges, setAllLounges] = React.useState<LoungeRow[] | null>(null);
  const [unit, setUnit] = React.useState<DistanceUnit>("mi");
  const [view, setView] = React.useState<"map" | "list">("map");
  const [mapFailed, setMapFailed] = React.useState(startsWithMapError);
```

por:

```ts
function ExploreScreen() {
  const online = useOnlineStatus();
  const offline = !online;

  /** Un miembro que vuelve sin conexión ya dio su ubicación antes: se salta el permiso. */
  const [step, setStep] = React.useState<LocationStep>(
    offline ? "located" : "asking",
  );
  const [cityId, setCityId] = React.useState(DEFAULT_CITY_ID);
  const [origin, setOrigin] = React.useState(() => {
    const city = cityById(DEFAULT_CITY_ID);
    return { lat: city.lat, lng: city.lng };
  });
  const [allLounges, setAllLounges] = React.useState<LoungeRow[] | null>(null);
  const [unit, setUnit] = React.useState<DistanceUnit>("mi");
  const [view, setView] = React.useState<"map" | "list">("map");
  const [mapFailed, setMapFailed] = React.useState(false);
```

Quitar el import ya sin uso de `useSearchParams`:

```ts
import { useSearchParams } from "next/navigation";
```

Como ya no hay `useSearchParams` en el archivo, quitar también el `Suspense`
que existía solo por eso. Reemplazar (líneas 72-80):

```tsx
/**
 * Los estados de borde (`?map=error`, `?offline=1`) se leen de la URL, y
 * `useSearchParams` obliga a un límite de Suspense para poder prerenderizar.
 */
export default function ExplorePage() {
  return (
    <RequireSession>
      <React.Suspense>
        <ExploreScreen />
      </React.Suspense>
    </RequireSession>
  );
}
```

por:

```tsx
export default function ExplorePage() {
  return (
    <RequireSession>
      <ExploreScreen />
    </RequireSession>
  );
}
```

Y cablear `onLoadError` de verdad en el render de `<CityMap>`:

```tsx
              onLoadError={() => {}}
```

por:

```tsx
              onLoadError={() => setMapFailed(true)}
```

- [ ] **Step 2: Reescribir "el mapa no carga" en el test (rojo)**

Reemplazar el `describe("el mapa no carga", ...)` completo (líneas 261-302)
por:

```ts
describe("el mapa no carga", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Simula que el script real de Google nunca terminó de cargar. */
  async function triggerMapLoadFailure(user: ReturnType<typeof userEvent.setup>) {
    await allowLocation(user);

    const realGoogle = (globalThis as { google?: unknown }).google;
    // @ts-expect-error -- se borra a propósito para simular un script que nunca carga.
    delete globalThis.google;

    vi.useFakeTimers();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    vi.useRealTimers();

    (globalThis as { google?: unknown }).google = realGoogle;
  }

  it("propone reintentar o seguir en la lista", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await triggerMapLoadFailure(user);

    expect(
      await screen.findByRole("heading", { name: "The map isn't loading" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use list view" }),
    ).toBeInTheDocument();
  });

  it("mantiene los resultados a la vista mientras el mapa falla", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);

    await triggerMapLoadFailure(user);

    expect(
      await within(resultsPanel()).findByText("The Ainsworth"),
    ).toBeInTheDocument();
  });

  it("pasa a la lista sin perder los resultados", async () => {
    const user = userEvent.setup({ delay: null });
    render(<ExplorePage />);
    await triggerMapLoadFailure(user);

    await user.click(
      await screen.findByRole("button", { name: "Use list view" }),
    );

    expect(
      screen.queryByRole("heading", { name: "The map isn't loading" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
```

- [ ] **Step 3: Ejecutar y ver que pasa**

```bash
npx vitest run src/app/explore/page.test.tsx
```

Expected: PASS — toda la suite del archivo en verde.

- [ ] **Step 4: Verificación completa del paquete**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: los tres sin errores. Si `next build` se queja de que falta un
límite de `Suspense` en `/explore`, es señal de que algo más en el archivo
sigue usando `useSearchParams`/`useRouter` de forma que lo necesite —
investigar antes de reintroducir el `Suspense` que se quitó.

- [ ] **Step 5: Commit**

```bash
git add src/app/explore/page.tsx src/app/explore/page.test.tsx
git commit -m "feat: replace ?map=error with real Google Maps load-failure detection"
```

---

## Task 9: Clustering de pines

**Files:**
- Modify: `src/components/explore/city-map.tsx`

No es un criterio de la Story 2.1 (salió como requerimiento adicional en el
brainstorming) y depende de la proyección geográfica real del mapa — no es
testeable de forma significativa en jsdom con el stub. Se implementa y se
verifica visualmente con Playwright en la Tarea 10, no con Vitest.

- [ ] **Step 1: Añadir el import**

```ts
import { MarkerClusterer } from "@googlemaps/markerclusterer";
```

- [ ] **Step 2: Agrupar los markers de lounge en un clusterer**

Reemplazar, dentro de `CityMap`, el bloque:

```tsx
          {lounges.map((lounge) => (
            <LoungeMarker
              key={lounge.id}
              lounge={lounge}
              selected={lounge.id === selectedId}
              offline={offline}
              onSelect={onSelect}
            />
          ))}
```

por:

```tsx
          <ClusteredLoungeMarkers
            lounges={lounges}
            selectedId={selectedId}
            offline={offline}
            onSelect={onSelect}
          />
```

Y añadir, junto a `LoungeMarker`:

```tsx
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
    new Map<string, google.maps.marker.AdvancedMarkerElement>(),
  );
  const clusterer = React.useRef<MarkerClusterer | null>(null);

  React.useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({ map });
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current = null;
    };
  }, [map]);

  React.useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers([...markers.current.values()]);
  });

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
```

Y ampliar `LoungeMarker` para aceptar y reenviar el `ref`:

```tsx
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
```

(el resto de `LoungeMarker` queda igual).

- [ ] **Step 3: Verificar tipos y que la suite sigue en verde**

```bash
npx tsc --noEmit
npx vitest run src/components/explore/city-map.test.tsx src/app/explore/page.test.tsx
```

Expected: ambos en verde. Si `tsc` se queja de que `AdvancedMarker` no acepta
`ref`, es la señal real de que esta versión de `@vis.gl/react-google-maps` usa
otro mecanismo (p. ej. un hook `useAdvancedMarkerRef`) — ajustar según lo que
diga el error de tipos, que es información concreta y confiable, a diferencia
de adivinar la API a ciegas.

- [ ] **Step 4: Commit**

```bash
git add src/components/explore/city-map.tsx
git commit -m "feat: cluster nearby lounge markers with @googlemaps/markerclusterer"
```

---

## Task 10: Verificación visual con Playwright

**Files:**
- Create: `scripts/playwright/scripts/explore/google-maps-verification.js`

- [ ] **Step 1: Crear el script a partir de la plantilla**

```bash
cp scripts/playwright/utils/template.js scripts/playwright/scripts/explore/google-maps-verification.js
```

- [ ] **Step 2: Editarlo**

Contenido de `scripts/playwright/scripts/explore/google-maps-verification.js`:

```javascript
const { launchBrowser, navigateTo, takeScreenshot, waitForServer } = require('../../utils/browser');

(async () => {
  await waitForServer();
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await navigateTo(page, '/explore');

  const allow = page.getByRole('button', { name: 'Allow location access' });
  await allow.click();

  await page.getByText('The Ainsworth').first().waitFor();
  await takeScreenshot(page, 'explore/google-maps-loaded.png');

  const firstMarker = page.getByRole('button', { name: /on the map$/ }).first();
  await firstMarker.click();
  await page.getByRole('group', { name: 'Selected lounge' }).waitFor();
  await takeScreenshot(page, 'explore/google-maps-callout.png');

  await page.getByRole('button', { name: 'Zoom out' }).click();
  await takeScreenshot(page, 'explore/google-maps-clustering.png');

  await browser.close();
})();
```

- [ ] **Step 3: Arrancar el dev server y ejecutar**

```bash
npm run dev
```

En otra terminal:

```bash
node scripts/playwright/scripts/explore/google-maps-verification.js
```

- [ ] **Step 4: Revisar las tres screenshots**

Confirmar visualmente en
`scripts/playwright/screenshots/explore/google-maps-loaded.png`,
`google-maps-callout.png` y `google-maps-clustering.png`:
- El mapa carga con los colores del tema propio (Map ID configurado por el
  usuario), no el estilo default de Google.
- Los 17 lounges (no solo 12) tienen su pin.
- El callout aparece centrado encima del pin seleccionado, con foto, nombre,
  distancia, rating y "View details".
- Al alejar el zoom, los lounges cercanos se agrupan en un cluster.

Si algo no coincide, ajustar el código correspondiente (`city-map.tsx`,
tokens del Map Style en la consola de Google) antes de seguir.

No se commitea el script de verificación puntual salvo que el usuario lo
pida — es una herramienta de comprobación, no parte del contrato del
producto. Preguntar antes de añadirlo al repo.

---

## Task 11: Actualizar `COMPONENT-MAP.md` y `PENDIENTES.md`

**Files:**
- Modify: `docs/design/COMPONENT-MAP.md`
- Modify: `docs/PENDIENTES.md`

- [ ] **Step 1: `COMPONENT-MAP.md` — fila de componentes (línea 239)**

Reemplazar:

```
| `explore/city-map.tsx` · `city-map-base.tsx` · `sun-mark.tsx` | Story 2.1 — el plano dibujado, sus markers y el zoom/pan |
```

por:

```
| `explore/city-map.tsx` · `sun-mark.tsx` · `use-map-load-status.ts` | Story 2.1 — Google Maps real (`@vis.gl/react-google-maps`), sus markers, zoom/pan y el timeout de carga |
```

- [ ] **Step 2: `COMPONENT-MAP.md` — sección "Backend real — Epic 2" (líneas 386-408)**

En la tabla de módulos (línea 394), reemplazar:

```
| `components/explore/lounge-map-positions.ts` | `LOUNGE_MAP_POSITIONS`: posición de cada lounge en el plano dibujado (dato de presentación, no geodato — no vive en `lounges`) |
```

por:

```
| `lib/online-status.ts` | `useOnlineStatus`: `navigator.onLine` real + eventos `online`/`offline`, sustituye el query param `?offline=1` |
```

Reemplazar las desviaciones de las líneas 405 y 408:

```
- **El proveedor de mapa real (Mapbox/MapLibre/Google) sigue fuera de alcance.** `city-map-base.tsx` sigue siendo el SVG dibujado de `Main.dc.html`; decidir proveedor y dónde vive su clave no cabe en este repo (ver `docs/PENDIENTES.md` §2.3). Por tanto siguen simulados por query param, sin proveedor real que los dispare: `?map=error` ("Map loads within 3 seconds" no tiene nada real que medir) y `?offline=1` (no hay service worker real).
```

por:

```
- **El proveedor de mapa es Google Maps real** (`@vis.gl/react-google-maps` + `@googlemaps/markerclusterer`), decisión tomada con el usuario — ver `docs/PENDIENTES.md` §2.3 (resuelto). El callout del lounge seleccionado se centra siempre encima de su pin (`bottom-full` + `-translate-x-1/2`), en vez del flip izquierda/derecha del mock atado al viewBox del SVG que ya no existe — desviación consciente, la proyección real de Google no tiene ese viewBox fijo.
```

y (línea 408):

```
- **`map: {x,y}` del SVG no entra en `lounges`**: es posición de píxel del plano dibujado, no geodato. Vive aparte en `lounge-map-positions.ts`, comentado como candidato a desaparecer con el proveedor real.
```

por:

```
- **Mini-mapa embebido en el perfil de lounge (Story 3.1) queda fuera de esta historia**: `/lounges/[id]` sigue en `lib/lounges.ts` (mock de Epic 3-9, sin lat/lng reales) y no tiene artboard con un hueco de mapa — ver `docs/PENDIENTES.md` nueva entrada §2.9.
```

- [ ] **Step 3: `PENDIENTES.md` — cerrar §2.2 y §2.3**

Reemplazar el bloque completo de "### 2.2 El proveedor de mapa real y sus dos
estados de borde siguen simulados" (líneas 77-99) por:

```
### 2.2 El proveedor de mapa real y sus dos estados de borde — resuelto

**Resuelto** (sept 2026): Google Maps real (`@vis.gl/react-google-maps`),
decisión tomada con el usuario. Los cuatro criterios de sistema/red de la
Story 2.1 ya tienen su condición real:

| Qué | Cómo está ahora |
|---|---|
| Permiso de ubicación | `lib/geolocation.ts` llama a `navigator.geolocation` de verdad |
| Error de carga del mapa | `useMapLoadStatus` — timeout real de 3s + `onError` del `APIProvider`, ya no `?map=error` |
| Modo offline | `useOnlineStatus` — `navigator.onLine` real + eventos `online`/`offline`, ya no `?offline=1`. El service worker real (qué queda "cacheado" de verdad) sigue sin construirse |
| Carga de la lista | `LoungeList` recibe un `loading` real de `fetchLounges` |
```

Reemplazar el bloque completo de "### 2.3 El plano de `\/explore` es el SVG
del artboard" (líneas 101-114) por:

```
### 2.3 El plano de `\/explore` — resuelto

**Resuelto** (sept 2026): `city-map-base.tsx` (el SVG de `Main.dc.html`) se
sustituyó por Google Maps real, conservando `CityMap` — markers, controles,
callout, escala — tal como anticipaba `DESIGN-SYSTEM.md` §6 (Fase 3). Detalle
en `docs/design/COMPONENT-MAP.md` "Backend real — Epic 2".
```

- [ ] **Step 4: `PENDIENTES.md` — nueva entrada §2.9**

Añadir después de "### 2.8 ..." (antes de la línea `---` que abre la sección
3), respetando la numeración correlativa:

```
### 2.9 Mini-mapa embebido en el perfil de lounge sigue sin construirse

Con Google Maps ya real en `/explore` (§2.3, resuelto), quedó fuera de
alcance añadir un mapa embebido en `/lounges/[id]` (Story 3.1) junto a los
botones Call/Directions. Dos motivos, no uno: `/lounges/[id]` sigue usando el
catálogo mock de `src/lib/lounges.ts` (Epic 3 sin conectar a Supabase, sin
`lat`/`lng` reales — solo una dirección de texto generada por hash, no
geocodificada), y no existe ningún artboard con un hueco de mapa en esa
pantalla.

**Desbloquea:** conectar Epic 3 a Supabase con datos de contacto reales
(mucho más grande que "añadir un mapa"), y que una historia futura diseñe
ese hueco en el artboard.
```

- [ ] **Step 5: `PENDIENTES.md` — actualizar la tabla de §3 (líneas 183-184)**

Reemplazar:

```
| 2.1 | Map loads within 3 seconds on good connection | No hay proveedor de mapa real que medir: el plano sigue siendo un SVG del propio bundle. El estado de fallo se alcanza por query param — ver §2.2 |
| 2.1 | Offline mode shows cached nearby locations | Los "cacheados" son los seis más cercanos del catálogo real; el service worker no interviene — ver §2.2 |
```

por:

```
| 2.1 | Offline mode shows cached nearby locations | Los "cacheados" son los seis más cercanos del catálogo real; `navigator.onLine` ya es real (§2.2), el service worker que guardaría datos de verdad no interviene todavía |
```

(la fila de "Map loads within 3 seconds" se quita entera de la tabla: ya no
es declarativo, `useMapLoadStatus` lo mide de verdad.)

- [ ] **Step 6: Commit**

```bash
git add docs/design/COMPONENT-MAP.md docs/PENDIENTES.md
git commit -m "docs: close map-provider PENDIENTES items, document Google Maps deviations"
```

---

## Task 12: Verificación final completa

- [ ] **Step 1: Suite completa**

```bash
npm test
```

Expected: todo en verde, sin tests omitidos.

- [ ] **Step 2: Tipos**

```bash
npx tsc --noEmit
```

Expected: sin salida.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: sin problemas.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: compila y lista `/explore` entre las rutas.

- [ ] **Step 5: Dev server real**

```bash
npm run dev
```

Confirmar `http://localhost:3000/explore` responde 200 y el mapa carga con
el Map ID/tema reales — comparar contra las screenshots de la Tarea 10 si
algo cambió desde entonces.

- [ ] **Step 6: Revisar `docs/PENDIENTES.md` una vez más**

Confirmar que §2.2, §2.3 quedaron cerrados y §2.9 (mini-mapa de perfil) y el
rollout de la key a Vercel/staging/prod quedaron anotados como abiertos —
ambos ya se hicieron en la Tarea 11, esto es solo la relectura final del
paso 9 de la receta de CLAUDE.md.
