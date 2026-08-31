import { describe, expect, it } from "vitest";

import { CITIES, loungeCountIn, searchCities } from "./location";
import { LOUNGES } from "./lounges";

/**
 * Story 2.1 — "Fallback to manual location entry if GPS unavailable".
 * Artboard: ManualLocation.dc.html
 */

describe("búsqueda de ubicación manual", () => {
  it("encuentra la ciudad por el principio del nombre", () => {
    const results = searchCities("New Yor");

    expect(results.map((city) => city.id)).toEqual(["new-york"]);
  });

  it("ignora mayúsculas y espacios sobrantes", () => {
    expect(searchCities("  new york  ").map((city) => city.id)).toEqual([
      "new-york",
    ]);
  });

  it("devuelve todas las coincidencias parciales", () => {
    const ids = searchCities("New").map((city) => city.id);

    expect(ids).toContain("new-york");
    expect(ids).toContain("newark");
    expect(ids).toContain("new-rochelle");
  });

  it("no devuelve nada con una consulta vacía", () => {
    expect(searchCities("   ")).toEqual([]);
  });

  it("no devuelve nada cuando ninguna ciudad coincide", () => {
    expect(searchCities("Reikiavik")).toEqual([]);
  });
});

describe("cuántos lounges hay en cada ciudad", () => {
  it("cuenta los lounges del catálogo, no una cifra escrita a mano", () => {
    for (const city of CITIES) {
      const counted = LOUNGES.filter(
        (lounge) => lounge.cityId === city.id,
      ).length;

      expect(loungeCountIn(city.id)).toBe(counted);
    }
  });

  it("da a Nueva York los doce lounges que anuncia el panel de resultados", () => {
    expect(loungeCountIn("new-york")).toBe(12);
  });
});
