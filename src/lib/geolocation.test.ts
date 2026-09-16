import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentPosition } from "./geolocation";

/**
 * Story 2.1 — "Current location detection with permission request" /
 * "Fallback to manual location entry if GPS unavailable".
 *
 * `navigator.geolocation` no existe en jsdom: se sustituye por completo en
 * cada test (no es un relleno de plataforma como `IntersectionObserver` en
 * `vitest.setup.ts`, es la única forma de controlar qué responde el navegador).
 */

function stubGeolocation(
  behavior: (
    onSuccess: PositionCallback,
    onError?: PositionErrorCallback,
  ) => void,
) {
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition: vi.fn(behavior) },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCurrentPosition", () => {
  it("resuelve con las coordenadas cuando el navegador concede el permiso", async () => {
    stubGeolocation((onSuccess) => {
      onSuccess({
        coords: { latitude: 40.758, longitude: -73.968 },
      } as GeolocationPosition);
    });

    await expect(getCurrentPosition()).resolves.toEqual({
      status: "granted",
      coords: { lat: 40.758, lng: -73.968 },
    });
  });

  it("resuelve 'denied' cuando el miembro rechaza el permiso", async () => {
    stubGeolocation((_onSuccess, onError) => {
      onError!({ code: 1 } as GeolocationPositionError);
    });

    await expect(getCurrentPosition()).resolves.toEqual({ status: "denied" });
  });

  it("resuelve 'unavailable' cuando la posición no se puede determinar", async () => {
    stubGeolocation((_onSuccess, onError) => {
      onError!({ code: 2 } as GeolocationPositionError);
    });

    await expect(getCurrentPosition()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("resuelve 'timeout' cuando el navegador tarda demasiado", async () => {
    stubGeolocation((_onSuccess, onError) => {
      onError!({ code: 3 } as GeolocationPositionError);
    });

    await expect(getCurrentPosition()).resolves.toEqual({
      status: "timeout",
    });
  });

  it("resuelve 'unavailable' cuando el navegador no trae geolocalización", async () => {
    vi.stubGlobal("navigator", {});

    await expect(getCurrentPosition()).resolves.toEqual({
      status: "unavailable",
    });
  });
});
