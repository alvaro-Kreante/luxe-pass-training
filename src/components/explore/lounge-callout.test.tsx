import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoungeCallout } from "./lounge-callout";
import type { MapLounge } from "./city-map";

const LOUNGE: MapLounge = {
  id: "the-ainsworth",
  name: "The Ainsworth",
  neighborhood: "Midtown",
  city: "New York",
  cityId: "new-york",
  lat: 40.7549,
  lng: -73.984,
  amenities: [],
  rating: 4.8,
  openNow: true,
  slotsToday: 3,
  hours: "8am–10pm",
  bands: [],
  closedWeekdays: [],
  featured: true,
  distanceMiles: 0.3,
};

/**
 * `LoungeCallout` mide su propia posición contra su ancestro marcado con
 * `[data-map-surface]` (el wrapper `overflow-hidden` real de `city-map.tsx`
 * — un atributo de datos, no la clase de estilo `bg-map-land`, para que la
 * consulta no se rompa en silencio si esa clase cambia por motivos
 * puramente visuales) con `getBoundingClientRect` (regresión: antes del fix
 * siempre se anclaba `bottom-full`, arriba del pin, y se clipeaba cuando el
 * pin caía cerca del borde superior del mapa — `overflow-hidden`). jsdom no
 * hace layout real (todo `getBoundingClientRect` devuelve ceros), así que
 * se stubea por elemento: el contenedor `[data-map-surface]` reporta un
 * `top` fijo, y el callout reporta el `top` que se quiera simular para cada
 * escenario.
 */
function mockRects({
  containerTop,
  calloutTop,
}: {
  containerTop: number;
  calloutTop: number;
}) {
  return vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: HTMLElement) {
      const top = this.hasAttribute("data-map-surface")
        ? containerTop
        : calloutTop;
      return {
        top,
        bottom: top + 150,
        left: 0,
        right: 302,
        width: 302,
        height: 150,
        x: 0,
        y: top,
        toJSON() {
          return this;
        },
      } as DOMRect;
    });
}

describe("LoungeCallout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("se voltea debajo del pin cuando arriba se saldría del contenedor del mapa", () => {
    mockRects({ containerTop: 100, calloutTop: 40 });

    render(
      <div data-map-surface>
        <LoungeCallout lounge={LOUNGE} unit="mi" />
      </div>,
    );

    expect(screen.getByRole("group", { name: "Selected lounge" })).toHaveClass(
      "top-full",
    );
  });

  it("se queda arriba del pin cuando hay espacio dentro del mapa", () => {
    mockRects({ containerTop: 100, calloutTop: 150 });

    render(
      <div data-map-surface>
        <LoungeCallout lounge={LOUNGE} unit="mi" />
      </div>,
    );

    expect(screen.getByRole("group", { name: "Selected lounge" })).toHaveClass(
      "bottom-full",
    );
  });
});
