/**
 * Stub mínimo y determinista de `window.google.maps` (Story 2.1, integración
 * con @vis.gl/react-google-maps). No sustituye código del proyecto: rellena
 * el global que un <script> real de Google inyectaría, mismo precedente que
 * el `IntersectionObserver` de `vitest.setup.ts`. `APIProvider` detecta que
 * `window.google.maps` ya existe y no intenta tocar la red.
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

  /**
   * Sin proyección real: hace que `MarkerClusterer.render()` (Task 9,
   * clustering) devuelva de inmediato en vez de intentar calcular clusters
   * con geometría que este stub no simula — el propio párrafo de la tarea
   * dice que ese cálculo no es testeable de forma significativa en jsdom.
   */
  getProjection() {
    return undefined;
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

/**
 * `useApiLoadingStatus` en @vis.gl/react-google-maps llama a
 * `google.maps.Settings.getInstance()` una vez el script "carga" para
 * cablear `fetchAppCheckToken` — falta en el stub original, lo pidió este
 * error real: `Cannot read properties of undefined (reading 'getInstance')`.
 */
class StubSettings {
  static #instance: StubSettings;
  fetchAppCheckToken: unknown;

  static getInstance() {
    return (StubSettings.#instance ??= new StubSettings());
  }
}

/**
 * `@googlemaps/markerclusterer` (Task 9, clustering) subclasses its own base
 * overlay by copying every enumerable member off `google.maps.OverlayView.prototype`
 * onto its own prototype the first time it's instantiated — the same pattern
 * the real Maps JS API uses (`OverlayView.prototype.setMap = function () {...}`,
 * not ES class methods, which is why these are plain prototype assignments
 * here too: ES class methods aren't enumerable and the copy would silently
 * skip them). Only `setMap`/`getMap` are actually reached by the paths this
 * project exercises (`MarkerClusterer`'s own `render()` bails out via
 * `StubMapCanvas.getProjection()` above before touching real projection
 * geometry), but `getProjection` is included too since the real API exposes
 * it on every overlay.
 */
type StubOverlayViewInstance = {
  map: StubMapCanvas | null;
  onAdd?: () => void;
  onRemove?: () => void;
};

class StubOverlayView implements StubOverlayViewInstance {
  map: StubMapCanvas | null = null;
}

Object.assign(StubOverlayView.prototype, {
  setMap(this: StubOverlayViewInstance, map: StubMapCanvas | null) {
    this.map = map;
    if (map) this.onAdd?.();
    else this.onRemove?.();
  },
  getMap(this: StubOverlayViewInstance) {
    return this.map;
  },
  getProjection() {
    return undefined;
  },
});

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

/**
 * Instala el stub en `globalThis.google` y los env vars de key/Map ID que
 * los tests no necesitan reales. Se llama una vez desde `vitest.setup.ts`.
 */
export function installGoogleMapsStub() {
  Object.defineProperty(globalThis, "google", {
    writable: true,
    configurable: true,
    value: {
      maps: {
        Map: StubMapCanvas,
        LatLng: StubLatLng,
        Settings: StubSettings,
        OverlayView: StubOverlayView,
        marker: {
          AdvancedMarkerElement: StubAdvancedMarkerElement,
        },
        event: {
          addListener: (
            instance: StubMapCanvas,
            eventName: string,
            handler: () => void,
          ) => instance.addListener(eventName, handler),
          /**
           * `MarkerClusterer.onRemove()` (Task 9, clustering teardown) calls
           * `google.maps.event.removeListener(this.idleListener)` with the
           * handle `StubMapCanvas.addListener` returned — same shape as the
           * real API's `MapsEventListener`, so removing it is just deferring
           * to that handle's own `remove()`.
           */
          removeListener: (listener: { remove: () => void }) =>
            listener.remove(),
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
}
