import "@testing-library/jest-dom/vitest";

import { installGoogleMapsStub } from "@/test/google-maps-stub";

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

Object.defineProperty(globalThis, "WebSocket", {
  writable: true,
  configurable: true,
  value: InertWebSocket,
});
