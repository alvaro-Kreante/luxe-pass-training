/**
 * MUERTO desde la migración a Google Maps (Story 2.1): `city-map.tsx` ya no
 * renderiza `CityMapBase`, es un proveedor real. Solo sigue aquí porque
 * `lounge-callout.tsx` todavía importa `MAP_VIEWBOX` de este archivo. Se
 * borra entero cuando esa historia posterior reescriba el callout sobre
 * lat/lng reales — ver comentario en `city-map.tsx` sobre `MapLounge.map`.
 */

/**
 * El plano de la ciudad, portado literalmente de `Main.dc.html`.
 *
 * DESIGN-SYSTEM.md §5 "Mapa": era un SVG dibujado a mano (viewBox 0 0 820
 * 760), no un proveedor de tiles — cierto mientras este repo fue solo mockup.
 */
export const MAP_VIEWBOX = { width: 820, height: 760 };

export function CityMapBase({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 820 760"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      <rect width="820" height="760" fill="var(--map-land)" />
      <path
        d="M0 626 C120 604 210 664 330 650 L330 760 L0 760 Z"
        fill="var(--map-water)"
      />
      <rect x="452" y="128" width="196" height="146" rx="12" fill="var(--map-park)" />

      <g fill="var(--map-block)">
        <rect x="118" y="138" width="54" height="60" rx="3" />
        <rect x="118" y="238" width="54" height="76" rx="3" />
        <rect x="210" y="140" width="72" height="56" rx="3" />
        <rect x="210" y="246" width="34" height="62" rx="3" />
        <rect x="256" y="240" width="30" height="70" rx="3" />
        <rect x="318" y="150" width="66" height="48" rx="3" />
        <rect x="318" y="352" width="66" height="60" rx="3" />
        <rect x="410" y="344" width="76" height="70" rx="3" />
        <rect x="518" y="348" width="64" height="64" rx="3" />
        <rect x="614" y="140" width="70" height="66" rx="3" />
        <rect x="614" y="244" width="70" height="62" rx="3" />
        <rect x="716" y="150" width="84" height="52" rx="3" />
        <rect x="716" y="352" width="84" height="66" rx="3" />
        <rect x="120" y="452" width="58" height="66" rx="3" />
        <rect x="212" y="448" width="70" height="74" rx="3" />
        <rect x="518" y="452" width="72" height="70" rx="3" />
        <rect x="618" y="456" width="62" height="62" rx="3" />
        <rect x="410" y="560" width="74" height="58" rx="3" />
      </g>

      <g stroke="var(--map-street)" strokeLinecap="round" fill="none">
        <g strokeWidth="9">
          <path d="M190 0V760" />
          <path d="M400 0V760" />
          <path d="M600 0V760" />
          <path d="M0 220H820" />
          <path d="M0 430H820" />
          <path d="M0 650H330" />
          <path d="M330 650H820" />
        </g>
        <g strokeWidth="17">
          <path d="M100 0V760" />
          <path d="M300 0V760" />
          <path d="M500 0V760" />
          <path d="M700 0V760" />
          <path d="M0 120H820" />
          <path d="M0 330H820" />
          <path d="M0 540H820" />
        </g>
        <path strokeWidth="14" d="M-20 706 L840 86" />
      </g>

      <g
        fill="#BCAB99"
        fontFamily="var(--font-manrope), sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="1.4"
      >
        <text x="292" y="86" transform="rotate(-90 292 86)">
          FIFTH AVENUE
        </text>
        <text x="492" y="640" transform="rotate(-90 492 640)">
          PARK AVENUE
        </text>
        <text x="36" y="325">
          W 42ND STREET
        </text>
        <text x="620" y="535">
          E 34TH STREET
        </text>
        <text x="524" y="212" fill="#A9B08F">
          SOLEIL PARK
        </text>
        <text x="60" y="704" fill="#9FB2B0">
          EAST RIVER
        </text>
      </g>
    </svg>
  );
}
