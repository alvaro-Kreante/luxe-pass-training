/**
 * Story 2.1 — posición de cada lounge sobre el plano dibujado
 * (`city-map-base.tsx`, el SVG de `Main.dc.html`), en coordenadas del viewBox
 * 820×760. Es dato de presentación, no geodato: no vive en `public.lounges`
 * (que sí guarda lat/lng reales) porque desaparece entero el día que se
 * sustituya el plano por un proveedor real — ver docs/PENDIENTES.md §2.3.
 *
 * Un lounge sin entrada aquí simplemente no sale como marker en el mapa
 * (ya es el comportamiento de `CityMap`), solo en la lista/panel.
 */
export const LOUNGE_MAP_POSITIONS: Record<string, { x: number; y: number }> = {
  "the-ainsworth": { x: 375, y: 375 },
  "belmont-terrace": { x: 158, y: 208 },
  "aurelia-house": { x: 574, y: 168 },
  "the-winslow-club": { x: 724, y: 232 },
  "celeste-rooftop": { x: 242, y: 498 },
  "halcyon-reading-room": { x: 610, y: 546 },
  "the-meridian-salon": { x: 770, y: 608 },
  "rue-lafayette-club": { x: 450, y: 662 },
  "the-cordelia": { x: 300, y: 120 },
  "sable-and-stone": { x: 100, y: 560 },
  "the-ellery-room": { x: 660, y: 430 },
  "verandah-no-9": { x: 330, y: 250 },
};
