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
