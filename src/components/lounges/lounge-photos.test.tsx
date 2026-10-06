import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoungeListItem } from "@/components/explore/lounge-list-item";
import { HeroCarousel } from "@/components/lounges/hero-carousel";
import { PhotoGalleryDialog } from "@/components/lounges/photo-gallery-dialog";
import type { LoungeWithDistance } from "@/lib/lounge-directory";
import type { LoungeImage } from "@/lib/lounge-profile";

/** Story 3.1 / 10.10 — el miembro ve las fotos reales del lounge. */

const lounge: LoungeWithDistance = {
  id: "test-photo-lounge",
  name: "Photo Lounge",
  neighborhood: "Midtown",
  city: "New York",
  cityId: "new-york",
  lat: 40.75,
  lng: -73.98,
  amenities: ["wifi"],
  rating: 4.8,
  openNow: true,
  slotsToday: 4,
  hours: "8 AM – 10 PM",
  bands: ["morning"],
  closedWeekdays: [],
  featured: false,
  distanceMiles: 0.4,
  mainImageUrl: "https://cdn.example.com/main.jpg",
};

const images: LoungeImage[] = [
  { id: "1", url: "https://cdn.example.com/a.jpg", caption: "Main hall", position: 0 },
  { id: "2", url: "https://cdn.example.com/b.jpg", caption: "Terrace", position: 1 },
  { id: "3", url: "https://cdn.example.com/c.jpg", caption: "Bar", position: 2 },
];

describe("fotos del lounge", () => {
  it("la fila de Explore muestra la foto principal", () => {
    render(<LoungeListItem lounge={lounge} unit="mi" />);

    expect(screen.getByRole("img", { name: "Photo Lounge" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/main.jpg",
    );
  });

  it("el carrusel de la ficha muestra las fotos reales", () => {
    render(<HeroCarousel loungeId={lounge.id} images={images} onOpenGallery={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Main hall" })).toHaveAttribute("src", images[0].url);
    expect(screen.getByRole("img", { name: "Terrace" })).toHaveAttribute("src", images[1].url);
  });

  it("la galería muestra la foto elegida", () => {
    render(
      <PhotoGalleryDialog
        open
        onOpenChange={vi.fn()}
        loungeId={lounge.id}
        loungeName={lounge.name}
        images={images}
        initialIndex={2}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("img", { name: "Bar" })[0]).toHaveAttribute("src", images[2].url);
  });
});
