import { describe, expect, it } from "vitest";

import {
  formatDistance,
  formatDistanceBand,
  haversineMiles,
  walkingMinutes,
} from "./distance";

/**
 * Story 2.1 — "Distance display in miles/km based on user preference".
 */

describe("distancia en las unidades del miembro", () => {
  it("muestra las millas con un decimal", () => {
    expect(formatDistance(0.3, "mi")).toBe("0.3 mi");
  });

  it("convierte a kilómetros cuando el miembro prefiere el sistema métrico", () => {
    expect(formatDistance(1, "km")).toBe("1.6 km");
  });

  it("redondea al mismo decimal en las dos unidades", () => {
    expect(formatDistance(0.3, "km")).toBe("0.5 km");
  });

  it("no pierde la unidad en distancias largas", () => {
    expect(formatDistance(2.8, "mi")).toBe("2.8 mi");
    expect(formatDistance(2.8, "km")).toBe("4.5 km");
  });
});

describe("bandas de distancia de los filtros", () => {
  it("no arrastra un decimal vacío: la banda es \"2 mi\", no \"2.0 mi\"", () => {
    expect(formatDistanceBand(2, "mi")).toBe("2 mi");
  });

  it("conserva el decimal cuando lo hay", () => {
    expect(formatDistanceBand(0.5, "mi")).toBe("0.5 mi");
    expect(formatDistanceBand(1, "km")).toBe("1.6 km");
  });
});

describe("distancia real entre dos coordenadas (Story 2.1 — Supabase)", () => {
  it("da cero para el mismo punto", () => {
    const point = { lat: 40.758, lng: -73.968 };

    expect(haversineMiles(point, point)).toBe(0);
  });

  it("un grado de longitud en el ecuador son unas 69 millas", () => {
    const miles = haversineMiles(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    );

    expect(miles).toBeCloseTo(69.1, 0);
  });

  it("no depende del orden de los puntos", () => {
    const a = { lat: 40.7536, lng: -73.9832 };
    const b = { lat: 40.758, lng: -73.968 };

    expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 6);
  });

  it("da una distancia acorde a la que ya anuncia el catálogo de muestra (Manhattan-Newark, ~9-10 mi)", () => {
    const manhattan = { lat: 40.7128, lng: -74.006 };
    const newark = { lat: 40.7357, lng: -74.1724 };

    expect(haversineMiles(manhattan, newark)).toBeGreaterThan(8);
    expect(haversineMiles(manhattan, newark)).toBeLessThan(11);
  });
});

describe("tiempo a pie", () => {
  it("cuenta veinte minutos por milla, como los artboards", () => {
    expect(walkingMinutes(0.3)).toBe(6);
    expect(walkingMinutes(0.6)).toBe(12);
    expect(walkingMinutes(1.2)).toBe(24);
  });

  it("nunca baja de un minuto, por cerca que esté", () => {
    expect(walkingMinutes(0.01)).toBe(1);
  });
});
