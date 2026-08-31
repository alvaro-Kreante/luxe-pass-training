/**
 * Catálogo de muestra de lounges. Los nombres, barrios y valoraciones salen de
 * los artboards de la Fase 3 (`Main`, `ListView`) y del Home de la Fase 1.
 * No hay backend: esta lista es todo lo que existe.
 */
export interface Lounge {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  rating: number;
  /** Destacado en el Home del área de miembro. */
  featured?: boolean;
}

export const LOUNGES: Lounge[] = [
  {
    id: "the-ainsworth",
    name: "The Ainsworth",
    neighborhood: "Midtown East",
    city: "New York",
    rating: 4.9,
    featured: true,
  },
  {
    id: "marbella-sky-lounge",
    name: "Marbella Sky Lounge",
    neighborhood: "Brickell",
    city: "Miami",
    rating: 4.7,
    featured: true,
  },
  {
    id: "belmont-terrace",
    name: "Belmont Terrace",
    neighborhood: "Bryant Park",
    city: "New York",
    rating: 4.8,
    featured: true,
  },
  {
    id: "aurelia-house",
    name: "Aurelia House",
    neighborhood: "NoMad",
    city: "New York",
    rating: 4.7,
  },
  {
    id: "the-winslow-club",
    name: "The Winslow Club",
    neighborhood: "Flatiron",
    city: "New York",
    rating: 4.6,
  },
  {
    id: "celeste-rooftop",
    name: "Céleste Rooftop",
    neighborhood: "Chelsea",
    city: "New York",
    rating: 4.8,
  },
  {
    id: "halcyon-reading-room",
    name: "Halcyon Reading Room",
    neighborhood: "Gramercy",
    city: "New York",
    rating: 4.5,
  },
  {
    id: "the-meridian-salon",
    name: "The Meridian Salon",
    neighborhood: "SoHo",
    city: "New York",
    rating: 4.6,
  },
];

export function featuredLounges(): Lounge[] {
  return LOUNGES.filter((lounge) => lounge.featured);
}
