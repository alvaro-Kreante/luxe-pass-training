/**
 * Story 3.1 — "Hero image carousel (min 3 images)". No hay fotografía real
 * (docs/PENDIENTES.md): las seis fotos son el mismo bloque de marca de
 * `LoungeThumb` en distinto tono, con la leyenda que ya usan `Main.dc.html` y
 * `Gallery.dc.html`. Una sola lista para todo el catálogo.
 */
export interface HeroPhoto {
  caption: string;
  detail?: string;
}

export const HERO_PHOTOS: HeroPhoto[] = [
  { caption: "Main lounge · Level 2" },
  { caption: "Day rooms" },
  { caption: "Co-working floor", detail: "Level 3 · desks, pods and quiet booths" },
  { caption: "Reception" },
  { caption: "Private suite" },
  { caption: "Terrace" },
];
