import { describe, expect, it } from "vitest";

import { isPreciseEnough } from "./place-search";

/**
 * Story 2.1 — "Fallback to manual location entry if GPS unavailable".
 * Un país o una región no sirven de origen: su centroide puede caer a
 * cientos de millas de cualquier sitio donde esté el miembro.
 */
describe("qué sugerencias de Google Places sirven como ubicación", () => {
  it("acepta ciudades, barrios, direcciones y lugares concretos", () => {
    expect(isPreciseEnough(["locality", "political"])).toBe(true);
    expect(isPreciseEnough(["sublocality", "political"])).toBe(true);
    expect(isPreciseEnough(["street_address", "geocode"])).toBe(true);
    expect(isPreciseEnough(["airport", "establishment"])).toBe(true);
    expect(isPreciseEnough(["lodging", "establishment"])).toBe(true);
  });

  it("descarta países y regiones", () => {
    expect(isPreciseEnough(["country", "political"])).toBe(false);
    expect(isPreciseEnough(["administrative_area_level_1", "political"])).toBe(false);
    expect(isPreciseEnough(["administrative_area_level_2", "political"])).toBe(false);
    expect(isPreciseEnough(["continent"])).toBe(false);
  });
});
