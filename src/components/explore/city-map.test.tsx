import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

  describe("controles de zoom", () => {
    it("empieza con 'Zoom out' deshabilitado en la vista más amplia", async () => {
      render(
        <CityMap
          lounges={LOUNGES}
          origin={{ lat: 40.7595, lng: -73.97 }}
          onSelect={vi.fn()}
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
          onLoadError={vi.fn()}
        />,
      );

      await user.click(
        await screen.findByRole("button", { name: "Zoom in" }),
      );

      expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
    });
  });
});
