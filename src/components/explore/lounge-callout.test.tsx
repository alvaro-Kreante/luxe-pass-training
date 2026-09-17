import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  /**
   * Regresión: "View details" no navegaba nunca al hacer clic desde un pin
   * real del mapa (bug reportado por el usuario, solo reproducible con
   * Playwright — jsdom no aplica `pointer-events` en clics sintéticos ni
   * replica el aviso de Google Maps "Focusable child elements... are not
   * supported"). Causa real, en dos partes:
   * 1. El `AdvancedMarker` que envuelve este callout en `city-map.tsx` no
   *    tenía ningún handler interactivo, así que la librería le ponía
   *    `pointer-events: none` al contenido — "View details" era clickable
   *    visualmente pero nunca recibía el clic.
   * 2. Con eso corregido, Google seguía interceptando el foco de este link
   *    (es un elemento realmente enfocable dentro de un AdvancedMarker, algo
   *    que la propia consola de Google avisa como "not supported") entre
   *    `mousedown` y `mouseup`, desmontando el callout a mitad del clic.
   *    `tabIndex={-1}` lo saca del focus-management de Google sin dejar de
   *    ser clickable con ratón.
   * Ambos fixes viven en el código real; aquí solo se verifica lo que jsdom
   * sí puede observar: que el link no vuelve a quedar en el tab order, y que
   * un clic dentro del callout no burbujea hasta un ancestro (el mapa real
   * escucha el clic ahí para deseleccionar).
   */
  it("el link 'View details' no está en el tab order (evita el conflicto de foco de Google Maps)", () => {
    mockRects({ containerTop: 100, calloutTop: 150 });

    render(
      <div data-map-surface>
        <LoungeCallout lounge={LOUNGE} unit="mi" />
      </div>,
    );

    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
      "tabIndex",
      "-1",
    );
  });

  it("un clic dentro del callout no burbujea hasta un ancestro (p. ej. el onClick de deseleccionar del mapa)", async () => {
    const user = userEvent.setup({ delay: null });
    mockRects({ containerTop: 100, calloutTop: 150 });
    const onAncestorClick = vi.fn();

    render(
      <div data-map-surface onClick={onAncestorClick}>
        <LoungeCallout lounge={LOUNGE} unit="mi" />
      </div>,
    );

    await user.click(screen.getByText("The Ainsworth"));

    expect(onAncestorClick).not.toHaveBeenCalled();
  });
});
