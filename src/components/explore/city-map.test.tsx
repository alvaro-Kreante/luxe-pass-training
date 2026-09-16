import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CityMap } from "./city-map";

const LOUNGES = [
  {
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
  },
  {
    id: "belmont-terrace",
    name: "Belmont Terrace",
    neighborhood: "Chelsea",
    city: "New York",
    cityId: "new-york",
    lat: 40.7465,
    lng: -74.0014,
    amenities: [],
    rating: 4.6,
    openNow: true,
    slotsToday: 0,
    hours: "8am–10pm",
    bands: [],
    closedWeekdays: [],
    featured: false,
    distanceMiles: 1.1,
  },
];

describe("CityMap", () => {
  it("pone un marker por cada lounge, con su lat/lng real", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onLoadError={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "The Ainsworth on the map" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Belmont Terrace on the map" }),
    ).toBeInTheDocument();
  });

  it("sitúa al miembro en su ubicación real", async () => {
    render(
      <CityMap
        lounges={LOUNGES}
        origin={{ lat: 40.7595, lng: -73.97 }}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onLoadError={vi.fn()}
      />,
    );

    expect(await screen.findByText("You are here")).toBeInTheDocument();
  });

  describe("selección", () => {
    it("llama a onSelect al hacer clic en un marker", async () => {
      const user = userEvent.setup({ delay: null });
      const onSelect = vi.fn();
      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          onSelect={onSelect}
          onDeselect={vi.fn()}
          onLoadError={vi.fn()}
        />,
      );

      await user.click(
        await screen.findByRole("button", { name: "The Ainsworth on the map" }),
      );

      expect(onSelect).toHaveBeenCalledWith("the-ainsworth");
    });

    it("dibuja los children (callout) sobre el lounge seleccionado", async () => {
      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          selectedId="the-ainsworth"
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onLoadError={vi.fn()}
        >
          <div role="group" aria-label="Selected lounge">
            The Ainsworth detail
          </div>
        </CityMap>,
      );

      expect(
        await screen.findByRole("group", { name: "Selected lounge" }),
      ).toHaveTextContent("The Ainsworth detail");
    });
  });

  describe("cierre al hacer clic fuera", () => {
    it("llama a onDeselect al hacer clic en el fondo del mapa", async () => {
      const user = userEvent.setup({ delay: null });
      const onDeselect = vi.fn();
      const { container } = render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          selectedId="the-ainsworth"
          onSelect={vi.fn()}
          onDeselect={onDeselect}
          onLoadError={vi.fn()}
        >
          <div role="group" aria-label="Selected lounge">
            The Ainsworth detail
          </div>
        </CityMap>,
      );

      await screen.findByRole("group", { name: "Selected lounge" });

      const background = container.querySelector(
        '[data-stub-map-canvas="true"]',
      );
      expect(background).not.toBeNull();

      await user.click(background as HTMLElement);

      expect(onDeselect).toHaveBeenCalledTimes(1);
    });

    it("NO llama a onDeselect al hacer clic en un marker", async () => {
      const user = userEvent.setup({ delay: null });
      const onDeselect = vi.fn();
      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          onSelect={vi.fn()}
          onDeselect={onDeselect}
          onLoadError={vi.fn()}
        />,
      );

      await user.click(
        await screen.findByRole("button", { name: "The Ainsworth on the map" }),
      );

      expect(onDeselect).not.toHaveBeenCalled();
    });
  });

  describe("controles de zoom", () => {
    it("empieza con 'Zoom out' deshabilitado en la vista más amplia", async () => {
      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onLoadError={vi.fn()}
        />,
      );

      expect(
        await screen.findByRole("button", { name: "Zoom out" }),
      ).toBeDisabled();
    });

    it("habilita 'Zoom out' tras un 'Zoom in'", async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onLoadError={vi.fn()}
        />,
      );

      await user.click(
        await screen.findByRole("button", { name: "Zoom in" }),
      );

      expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
    });
  });

  describe("clustering", () => {
    // `afterEach`, no un `mockRestore()` manual al final del test: si el
    // `waitFor` de abajo llega a fallar (el modo de fallo exacto que este
    // test existe para detectar), un `mockRestore()` inline nunca llegaría a
    // ejecutarse y el spy se filtraría a los tests siguientes del archivo.
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("registra todos los lounges en el MarkerClusterer, no un array vacío", async () => {
      // Regresión: `AdvancedMarkerElement` se crea de forma asíncrona dentro
      // de `@vis.gl/react-google-maps` (espera a la librería `marker`, ver
      // `src/test/google-maps-stub.ts`), así que el ref de cada marker llega
      // después del primer render. Antes del fix, el efecto que alimentaba
      // al clusterer solo corría una vez al montar y siempre lo hacía con
      // `markers.current` vacío — `addMarkers` nunca llegaba a recibir los
      // lounges reales. Comprobar solo que `addMarkers` se llamó (sin mirar
      // con qué) habría dejado pasar ese bug: por eso se exige que, en algún
      // momento, se haya llamado con el set completo.
      const addMarkersSpy = vi.spyOn(MarkerClusterer.prototype, "addMarkers");

      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onLoadError={vi.fn()}
        />,
      );

      await screen.findByRole("button", { name: "The Ainsworth on the map" });
      await screen.findByRole("button", {
        name: "Belmont Terrace on the map",
      });

      await waitFor(() => {
        const calledWithFullSet = addMarkersSpy.mock.calls.some(
          (call) => call[0].length === LOUNGES.length,
        );
        expect(calledWithFullSet).toBe(true);
      });
    });
  });
});
