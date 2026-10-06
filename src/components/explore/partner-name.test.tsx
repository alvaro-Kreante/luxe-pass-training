import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DigitalPassCard } from "@/components/passes/digital-pass-card";
import type { LoungeWithDistance } from "@/lib/lounge-directory";
import { AINSWORTH_PASS } from "@/lib/passes";

import { LoungeCallout } from "./lounge-callout";
import { LoungeList } from "./lounge-list";

/**
 * Story 10.8 — el partner (hotel, spa…) como contexto del lounge en lo que
 * ve el miembro: tarjetas de /explore, callout del mapa y pase digital. Sin
 * partner, la tarjeta se ve igual que antes.
 */

const lounge: LoungeWithDistance = {
  id: "tower-a",
  name: "Tower A",
  neighborhood: "Midtown East",
  city: "New York",
  cityId: "new-york",
  lat: 40.76,
  lng: -73.97,
  amenities: ["wifi"],
  rating: 4.8,
  openNow: true,
  slotsToday: 4,
  hours: "Open until 9 PM",
  bands: ["morning"],
  closedWeekdays: [],
  featured: false,
  partnerName: "Halcyon Hotels",
  distanceMiles: 0.4,
};

describe("las tarjetas de /explore", () => {
  it("muestran el partner del lounge", () => {
    render(<LoungeList lounges={[lounge]} unit="mi" distanceNote="Near you" />);

    expect(screen.getByRole("heading", { name: "Tower A" })).toBeInTheDocument();
    expect(screen.getByText(/Halcyon Hotels/)).toBeInTheDocument();
  });

  it("sin partner se ven igual, sin ese dato", () => {
    render(<LoungeList lounges={[{ ...lounge, partnerName: null }]} unit="mi" distanceNote="Near you" />);

    expect(screen.getByRole("heading", { name: "Tower A" })).toBeInTheDocument();
    expect(screen.queryByText(/Halcyon Hotels/)).toBeNull();
  });

  it("el callout del mapa también lo muestra", () => {
    render(<LoungeCallout lounge={{ ...lounge, x: 50, y: 50 } as never} unit="mi" />);

    expect(screen.getByText(/Halcyon Hotels/)).toBeInTheDocument();
  });
});

describe("el pase digital", () => {
  it("muestra el partner junto al lounge", () => {
    render(<DigitalPassCard pass={{ ...AINSWORTH_PASS, partnerName: "Halcyon Hotels" }} state="upcoming" />);

    expect(screen.getByText(/Halcyon Hotels/)).toBeInTheDocument();
  });

  it("sin partner no lo menciona", () => {
    render(<DigitalPassCard pass={{ ...AINSWORTH_PASS, partnerName: null }} state="upcoming" />);

    expect(screen.queryByText(/Ainsworth Collection/)).toBeNull();
  });
});
