import type { Coordinates } from "./distance";

/**
 * Story 2.1 — "Current location detection with permission request",
 * "Fallback to manual location entry if GPS unavailable".
 *
 * `ManualLocationDialog` ya cubre el fallback; esto solo cablea el
 * disparador real en vez del `useState` de tres pasos que simulaba el
 * permiso.
 */
export type LocationResult =
  | { status: "granted"; coords: Coordinates }
  | { status: "denied" | "unavailable" | "timeout" };

/** Códigos de `GeolocationPositionError` (spec del navegador). */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function fromError(error: GeolocationPositionError): LocationResult {
  switch (error.code) {
    case PERMISSION_DENIED:
      return { status: "denied" };
    case TIMEOUT:
      return { status: "timeout" };
    case POSITION_UNAVAILABLE:
    default:
      return { status: "unavailable" };
  }
}

export function getCurrentPosition(
  options?: PositionOptions,
): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "unavailable" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: "granted",
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      (error) => resolve(fromError(error)),
      options,
    );
  });
}
