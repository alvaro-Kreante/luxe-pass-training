import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

import { installGoogleMapsStub } from "@/test/google-maps-stub";

// `findBy*`/`waitFor` esperan 1s por defecto. Las pantallas cargan de
// Supabase local real y la suite corre en paralelo: con 1s, cada corrida
// completa fallaba en tests distintos esperando una recarga que sí llegaba.
configure({ asyncUtilTimeout: 5000 });

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

/** Stub de `window.google.maps` (Story 2.1) — detalle en `src/test/google-maps-stub.ts`. */
installGoogleMapsStub();

/**
 * Epic 7 — Story 7.1 "real-time updates" usa un canal de Supabase Realtime
 * (`postgres_changes` sobre `bookings`, `components/partner/today-dashboard.tsx`).
 * jsdom no trae `WebSocket`, pero Node sí expone uno global (basado en
 * `undici`) que se filtra al entorno de test — y ese, al usarse desde
 * `@supabase/realtime-js` dentro de jsdom, revienta con
 * `TypeError: The "event" argument must be an instance of Event. Received
 * an instance of Event` (un mismatch de "realm" entre el `Event` de Node y
 * el de jsdom al procesar la conexión) — un bug de interoperabilidad
 * Node/jsdom, no del proyecto, y que no ocurre en un navegador real (donde
 * la app corre de verdad). Este stub inerte nunca completa el handshake
 * (nunca dispara `open`), así que ese código nunca se ejecuta en tests —
 * igual que el `IntersectionObserver` de arriba, no sustituye código del
 * proyecto, solo hace el entorno ejecutable.
 */
class InertWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState = InertWebSocket.CONNECTING;
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {
    this.readyState = InertWebSocket.CLOSED;
  }
}

// Solo en jsdom: un test con `@vitest-environment node` usa el `WebSocket`
// nativo de Node y recibe eventos de Realtime de verdad (DB-01).
if (typeof window !== "undefined") {
  Object.defineProperty(globalThis, "WebSocket", {
    writable: true,
    configurable: true,
    value: InertWebSocket,
  });
}

/**
 * Story 10.10 — el editor de fotos (`react-easy-crop` + recorte en
 * `<canvas>`, `src/lib/photo-crop.ts`) usa APIs que jsdom no trae:
 * `URL.createObjectURL`, `createImageBitmap`, `ResizeObserver` y un canvas
 * 2D con `toBlob`. Estos rellenos no dibujan nada: dan unas medidas fijas
 * (3000 × 2000) y un blob JPEG de unos bytes, lo justo para que el flujo
 * real (encuadre → recorte → subida a Storage) corra entero. Como el
 * `IntersectionObserver` de arriba, no sustituyen código del proyecto.
 */
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:jsdom-photo";
  URL.revokeObjectURL = () => {};
}

Object.defineProperty(globalThis, "createImageBitmap", {
  writable: true,
  configurable: true,
  value: async () => ({ width: 3000, height: 2000, close() {} }),
});

if (typeof globalThis.ResizeObserver === "undefined") {
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return { drawImage() {}, imageSmoothingQuality: "high" } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback, type?: string) {
    callback(new Blob(["jsdom-canvas"], { type: type ?? "image/png" }));
  };
}
