import { describe, expect, it } from "vitest";

import { CITIES, loungeCountIn, searchCities } from "./location";

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

describe("cada ciudad trae su centroide (Story 2.1 — origen para el fallback manual)", () => {
  it("tiene lat/lng numéricos", () => {
    for (const city of CITIES) {
      expect(typeof city.lat).toBe("number");
      expect(typeof city.lng).toBe("number");
    }
  });
});

describe("cuántos lounges hay en cada ciudad", () => {
  const lounges = [
    { cityId: "new-york" },
    { cityId: "new-york" },
    { cityId: "newark" },
  ];

  it("cuenta los lounges del catálogo recibido, no una cifra escrita a mano", () => {
    expect(loungeCountIn(lounges, "new-york")).toBe(2);
    expect(loungeCountIn(lounges, "newark")).toBe(1);
  });

  it("da cero para una ciudad sin lounges en el catálogo", () => {
    expect(loungeCountIn(lounges, "miami")).toBe(0);
  });
});
