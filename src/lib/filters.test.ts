import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  activeFilterChips,
  applyFilters,
  countMatching,
  suggestionsToRecoverResults,
  type Filters,
} from "./filters";
import { LOUNGES, loungesIn } from "./lounges";

/**
 * Story 2.2 — Lounge Filtering & Search.
 * Criterios en
 * docs/specs/epic-2-location-discovery-search/story-2.2-lounge-filtering-search.md
 * El mismo pipeline sirve al mapa y a la lista (nota del flow).
 */

const nearby = loungesIn("new-york");

function withFilters(partial: Partial<Filters>): Filters {
  return { ...EMPTY_FILTERS, ...partial };
}

describe("filtro por amenities", () => {
  it("exige todas las amenities elegidas, no una cualquiera", () => {
    const results = applyFilters(nearby, withFilters({ amenities: ["spa", "co-working"] }));

    expect(results.length).toBeGreaterThan(0);
    for (const lounge of results) {
      expect(lounge.amenities).toContain("spa");
      expect(lounge.amenities).toContain("co-working");
    }
  });

  it("no filtra nada cuando no hay ninguna elegida", () => {
    expect(applyFilters(nearby, EMPTY_FILTERS)).toHaveLength(nearby.length);
  });
});

describe("filtro por distancia", () => {
  it("deja fuera lo que está justo en el límite de la banda", () => {
    const results = applyFilters(nearby, withFilters({ maxDistanceMiles: 2 }));

    for (const lounge of results) {
      expect(lounge.distanceMiles).toBeLessThan(2);
    }
  });

  it("cada banda contiene a la anterior", () => {
    const half = applyFilters(nearby, withFilters({ maxDistanceMiles: 0.5 }));
    const five = applyFilters(nearby, withFilters({ maxDistanceMiles: 5 }));

    expect(five.length).toBeGreaterThan(half.length);
    for (const lounge of half) {
      expect(five).toContain(lounge);
    }
  });
});

describe("búsqueda por texto", () => {
  it("encuentra por nombre", () => {
    const results = applyFilters(nearby, withFilters({ query: "ainsworth" }));

    expect(results.map((lounge) => lounge.id)).toEqual(["the-ainsworth"]);
  });

  it("encuentra por barrio", () => {
    const results = applyFilters(nearby, withFilters({ query: "Flatiron" }));

    expect(results.map((lounge) => lounge.id)).toEqual(["the-winslow-club"]);
  });

  it("encuentra por amenity, como promete el marcador de posición", () => {
    const results = applyFilters(nearby, withFilters({ query: "co-working" }));

    expect(results.length).toBeGreaterThan(0);
    for (const lounge of results) {
      expect(lounge.amenities).toContain("co-working");
    }
  });

  it("no distingue mayúsculas ni espacios sobrantes", () => {
    expect(applyFilters(nearby, withFilters({ query: "  AINSWORTH " }))).toHaveLength(1);
  });

  it("devuelve nada cuando el texto no casa con nada", () => {
    expect(applyFilters(nearby, withFilters({ query: "helipuerto" }))).toHaveLength(0);
  });
});

describe("filtro por disponibilidad", () => {
  it("deja solo los lounges que abren ese día", () => {
    const sunday = "2025-09-14";
    const results = applyFilters(nearby, withFilters({ date: sunday }));

    expect(results.length).toBeLessThan(nearby.length);
    for (const lounge of results) {
      expect(lounge.closedWeekdays ?? []).not.toContain(0);
    }
  });

  it("estrecha aún más al elegir una franja horaria", () => {
    const date = "2025-09-15";
    const wholeDay = applyFilters(nearby, withFilters({ date }));
    const evening = applyFilters(nearby, withFilters({ date, band: "evening" }));

    expect(evening.length).toBeLessThanOrEqual(wholeDay.length);
    for (const lounge of evening) {
      expect(lounge.bands).toContain("evening");
    }
  });
});

describe("los filtros se acumulan", () => {
  it("aplica a la vez amenity, distancia, fecha y texto", () => {
    const filters = withFilters({
      amenities: ["wifi"],
      maxDistanceMiles: 2,
      date: "2025-09-15",
      query: "new york",
    });

    for (const lounge of applyFilters(nearby, filters)) {
      expect(lounge.amenities).toContain("wifi");
      expect(lounge.distanceMiles).toBeLessThan(2);
    }
  });

  it("el escenario de los artboards no devuelve ningún lounge", () => {
    const results = applyFilters(
      nearby,
      withFilters({
        amenities: ["wifi", "co-working"],
        maxDistanceMiles: 2,
        date: "2025-09-14",
        band: "afternoon",
      }),
    );

    expect(results).toHaveLength(0);
  });
});

describe("chips de filtros activos", () => {
  it("no muestra ninguno cuando no hay filtros", () => {
    expect(activeFilterChips(EMPTY_FILTERS, "mi")).toEqual([]);
  });

  it("da un chip por amenity y uno por la banda de distancia", () => {
    const chips = activeFilterChips(
      withFilters({ amenities: ["wifi", "co-working"], maxDistanceMiles: 2 }),
      "mi",
    );

    expect(chips.map((chip) => chip.label)).toEqual([
      "WiFi",
      "Co-working",
      "Within 2 mi",
    ]);
  });

  it("dice la distancia en las unidades del miembro", () => {
    const chips = activeFilterChips(withFilters({ maxDistanceMiles: 1 }), "km");

    expect(chips.map((chip) => chip.label)).toEqual(["Within 1.6 km"]);
  });

  it("junta el día y la franja en un solo chip", () => {
    const chips = activeFilterChips(
      withFilters({ date: "2025-09-14", band: "afternoon" }),
      "mi",
    );

    expect(chips.map((chip) => chip.label)).toEqual(["Sun, Sep 14 · 2–6 PM"]);
  });
});

describe("sugerencias cuando no hay resultados", () => {
  const dead = withFilters({
    amenities: ["wifi", "co-working"],
    maxDistanceMiles: 2,
    date: "2025-09-14",
    band: "afternoon",
  });

  it("solo propone cambios que devuelven lounges", () => {
    const proposals = suggestionsToRecoverResults(nearby, dead);

    expect(proposals.length).toBeGreaterThan(0);
    for (const proposal of proposals) {
      expect(proposal.count).toBeGreaterThan(0);
      expect(applyFilters(nearby, proposal.filters)).toHaveLength(proposal.count);
    }
  });

  it("no propone nada cuando los filtros ya devuelven resultados", () => {
    expect(suggestionsToRecoverResults(nearby, EMPTY_FILTERS)).toEqual([]);
  });
});

describe("cuántos lounges devolvería un cambio", () => {
  it("cuenta sobre el catálogo que se le pasa, no sobre el global", () => {
    expect(countMatching(nearby, EMPTY_FILTERS)).toBe(nearby.length);
    expect(countMatching(LOUNGES, EMPTY_FILTERS)).toBe(LOUNGES.length);
  });
});
