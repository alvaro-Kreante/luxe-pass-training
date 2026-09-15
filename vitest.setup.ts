import "@testing-library/jest-dom/vitest";

/**
 * jsdom no implementa IntersectionObserver, que el scroll infinito de la lista
 * (Story 2.3) necesita para existir. Este relleno no hace nada: los tests que
 * quieren simular que el centinela entra en pantalla lo sustituyen con
 * `vi.stubGlobal` por un doble que guarda el callback.
 */
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: NoopIntersectionObserver,
});

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
      Settings: StubSettings,
      marker: {
        AdvancedMarkerElement: StubAdvancedMarkerElement,
      },
      event: {
        addListener: (
          instance: StubMapCanvas,
          eventName: string,
          handler: () => void,
        ) => instance.addListener(eventName, handler),
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
