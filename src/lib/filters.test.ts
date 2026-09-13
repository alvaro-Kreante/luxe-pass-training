import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  activeFilterChips,
  applyFilters,
  countMatching,
  suggestionsToRecoverResults,
  type Filters,
} from "./filters";
import type { LoungeWithDistance } from "./lounge-directory";

/**
 * Story 2.2 — Lounge Filtering & Search.
 * Criterios en
 * docs/specs/epic-2-location-discovery-search/story-2.2-lounge-filtering-search.md
 * El mismo pipeline sirve al mapa y a la lista (nota del flow).
 *
 * Fixture propio (ya no `lib/lounges.ts`, que sigue siendo el mock de
 * Epic 3-9): los mismos 12 lounges de Nueva York que ya traía el catálogo de
 * muestra, con `distanceMiles` ya calculada (como la deja `withDistance`) en
 * vez de un campo fijo del mock.
 */
function loungeFixture(
  overrides: Partial<LoungeWithDistance> & Pick<LoungeWithDistance, "id">,
): LoungeWithDistance {
  return {
    name: "",
    neighborhood: "",
    city: "New York",
    cityId: "new-york",
    lat: 0,
    lng: 0,
    amenities: [],
    rating: 4.5,
    openNow: true,
    slotsToday: 1,
    hours: "",
    bands: [],
    closedWeekdays: [],
    featured: false,
    distanceMiles: 0,
    ...overrides,
  };
}

const nearby: LoungeWithDistance[] = [
  loungeFixture({
    id: "the-ainsworth",
    name: "The Ainsworth",
    neighborhood: "Midtown East",
    amenities: ["wifi", "co-working", "lounge", "luggage-storage"],
    distanceMiles: 0.3,
    bands: ["morning", "afternoon", "evening"],
    closedWeekdays: [0],
  }),
  loungeFixture({
    id: "belmont-terrace",
    name: "Belmont Terrace",
    neighborhood: "Bryant Park",
    amenities: ["wifi", "co-working", "luggage-storage"],
    distanceMiles: 0.6,
    bands: ["morning", "afternoon", "evening"],
    closedWeekdays: [0],
  }),
  loungeFixture({
    id: "aurelia-house",
    name: "Aurelia House",
    neighborhood: "NoMad",
    amenities: ["wifi", "co-working", "spa", "day-rooms"],
    distanceMiles: 0.9,
    bands: ["morning", "afternoon"],
    closedWeekdays: [0],
  }),
  loungeFixture({
    id: "the-winslow-club",
    name: "The Winslow Club",
    neighborhood: "Flatiron",
    amenities: ["wifi", "co-working", "day-rooms"],
    distanceMiles: 1.2,
    bands: ["morning", "afternoon", "evening"],
    closedWeekdays: [0],
  }),
  loungeFixture({
    id: "celeste-rooftop",
    name: "Céleste Rooftop",
    neighborhood: "Chelsea",
    amenities: ["wifi", "lounge", "spa"],
    distanceMiles: 1.6,
    bands: ["afternoon", "evening"],
  }),
  loungeFixture({
    id: "halcyon-reading-room",
    name: "Halcyon Reading Room",
    neighborhood: "Gramercy",
    amenities: ["wifi", "lounge"],
    distanceMiles: 2.1,
    bands: ["morning", "afternoon"],
    closedWeekdays: [1],
  }),
  loungeFixture({
    id: "the-meridian-salon",
    name: "The Meridian Salon",
    neighborhood: "SoHo",
    amenities: ["wifi", "lounge", "spa", "luggage-storage"],
    distanceMiles: 2.8,
    bands: ["afternoon", "evening"],
  }),
  loungeFixture({
    id: "rue-lafayette-club",
    name: "Rue Lafayette Club",
    neighborhood: "West Village",
    amenities: ["wifi", "co-working", "lounge"],
    distanceMiles: 3.3,
    bands: ["morning", "afternoon", "evening"],
  }),
  loungeFixture({
    id: "the-cordelia",
    name: "The Cordelia",
    neighborhood: "Upper East Side",
    amenities: ["wifi", "spa", "day-rooms", "luggage-storage"],
    distanceMiles: 3.7,
    bands: ["morning", "evening"],
    closedWeekdays: [2],
  }),
  loungeFixture({
    id: "sable-and-stone",
    name: "Sable & Stone",
    neighborhood: "Tribeca",
    amenities: ["wifi", "co-working", "luggage-storage"],
    distanceMiles: 4.1,
    bands: ["morning", "afternoon"],
  }),
  loungeFixture({
    id: "the-ellery-room",
    name: "The Ellery Room",
    neighborhood: "Murray Hill",
    amenities: ["wifi", "lounge", "day-rooms"],
    distanceMiles: 4.5,
    bands: ["afternoon", "evening"],
    closedWeekdays: [1],
  }),
  loungeFixture({
    id: "verandah-no-9",
    name: "Verandah No. 9",
    neighborhood: "Hudson Yards",
    amenities: ["wifi", "co-working", "spa", "lounge"],
    distanceMiles: 4.9,
    bands: ["morning", "afternoon", "evening"],
  }),
];

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
  it("cuenta sobre el catálogo que se le pasa, no sobre un global fijo", () => {
    expect(countMatching(nearby, EMPTY_FILTERS)).toBe(nearby.length);
    expect(countMatching(nearby.slice(0, 5), EMPTY_FILTERS)).toBe(5);
  });
});
