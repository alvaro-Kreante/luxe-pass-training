import { describe, expect, it } from "vitest";

import { AMENITIES, amenityDescription } from "./amenities";

/**
 * Story 3.1 — "Amenity icons with descriptions". El perfil de lounge muestra
 * una frase por amenity (Main.dc.html); esa frase es la misma para todos los
 * lounges que la ofrecen, ya que no hay un catálogo por lounge.
 */
describe("descripción de amenity", () => {
  it("da una descripción no vacía a cada amenity del catálogo", () => {
    for (const amenity of AMENITIES) {
      expect(amenityDescription(amenity.id).length).toBeGreaterThan(0);
    }
  });
});
