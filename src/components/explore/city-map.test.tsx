import { render, screen } from "@testing-library/react";
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
});
