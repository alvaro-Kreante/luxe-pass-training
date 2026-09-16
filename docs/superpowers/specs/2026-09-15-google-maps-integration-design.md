# Diseño: Google Maps real en `/explore` (Story 2.1)

Fecha: 2026-09-15
Rama: `feat/google-maps-integration` (a partir de `feat/epic-2-lounges-backend`)

## Contexto

`docs/PENDIENTES.md` §2.3 y `docs/design/COMPONENT-MAP.md` (sección "Backend real —
Epic 2") dejaban explícitamente abierta la decisión de proveedor de mapa
(Mapbox/MapLibre/Google) y dónde vive su clave, anotando que "nada de eso cabe en
este repositorio". Esa decisión ya se tomó: **Google Maps**. Este documento cubre
el resto: cómo se integra, con qué librería, y qué pasa con los estados que hoy
son simulados.

Hoy `/explore` (Story 2.1, Epic 2 — ya conectado a Supabase) renderiza un SVG
dibujado a mano (`city-map-base.tsx`) con posiciones de píxel simuladas
(`lounge-map-positions.ts`), aunque `public.lounges` ya tiene `lat`/`lng` reales
(`double precision not null`, sin default). El patrón "pin → callout de detalle
encima del mapa" ya existe visualmente en el artboard (`Main.dc.html`,
Fase 3) y en el componente `lounge-callout.tsx` — esta migración sustituye el
plano SVG por tiles reales conservando ese patrón, no inventa un diseño nuevo.

## Alcance

**Dentro de esta rama:** solo el mapa de `/explore` (Story 2.1).

**Fuera de esta rama** (anotar como pendiente, no implementar):
- Mini-mapa embebido en el perfil de lounge (`/lounges/[id]`, Story 3.1). Bloqueado
  por dos motivos: (1) Epic 3 todavía usa el catálogo mock de `src/lib/lounges.ts`
  sin `lat`/`lng` reales — solo una dirección de texto generada por hash, no
  geocodificada; conectar Epic 3 a Supabase es un trabajo mucho mayor que "añadir
  un mapa" y no se decide de paso aquí; (2) no existe artboard con un hueco de
  mini-mapa en esa pantalla.
- Rollout de la API key / Map ID a `staging`/`main` vía Vercel — Vercel todavía no
  está montado en el repo (`docs/ci-cd/RESUMEN.md`). Por ahora la key vive solo en
  `.env.local` de cada desarrollador.
- Geocodificación de cualquier dirección mock.

## Enfoque elegido

Se evaluaron tres enfoques para reemplazar `CityMap`:

- **A (elegido)** — mismo contrato externo de `CityMap`, pines y callout como
  `AdvancedMarker` de `@vis.gl/react-google-maps`.
- **B (descartado)** — igual que A pero con `InfoWindow` nativo de Google para el
  callout. Su chrome por defecto (recuadro/flecha/botón-cerrar) es difícil de
  anular del todo y choca con la exigencia del design system de un callout
  pixel-perfect.
- **C (descartado)** — Google Maps solo como fondo de tiles, manteniendo el
  posicionamiento manual de pines por proyección lat/lng→píxel propia. Reinventa
  lo que Google ya resuelve, pelea con sus gestos nativos de pan/zoom, y complica
  el requerimiento de clustering (las librerías de clustering esperan
  `Marker`/`AdvancedMarker` reales).

### Por qué A

`CityMap` conserva exactamente sus props actuales:

```ts
export interface CityMapProps {
  lounges: MapLounge[];
  selectedId?: string;
  onSelect: (id: string) => void;
  offline?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}
```

y sus `aria-label` de controles (`"Zoom in"`, `"Zoom out"`, `"Recentre the map"`),
así que `src/app/explore/page.tsx` casi no cambia y `page.test.tsx` sigue
funcionando como contrato de comportamiento.

Por dentro: un `AdvancedMarker` por lounge (con `SunMark` reutilizado tal cual
dentro) en vez del `<button>` posicionado en % sobre el SVG. El callout
seleccionado se renderiza como **otro** `AdvancedMarker` en las mismas
coordenadas — Google lo reposiciona solo en pan/zoom, sin proyección manual.

## Cambios de archivo

| Archivo | Cambio |
|---|---|
| `package.json` | + `@vis.gl/react-google-maps`, `@googlemaps/markerclusterer` |
| `src/components/explore/city-map.tsx` | Reescrito por dentro; mismo contrato público |
| `src/components/explore/city-map-base.tsx` | Eliminado (el SVG) |
| `src/components/explore/lounge-map-positions.ts` | Eliminado — ya no hace falta, se usa `lounge.lat`/`lounge.lng` real |
| `src/components/explore/lounge-callout.tsx` | Se quita el cálculo de posición (`left/top`, `FLIP_AT`, ligado al viewBox SVG); el contenido (foto, nombre, distancia, rating, "View details") se conserva igual — el posicionamiento lo resuelve el `AdvancedMarker` contenedor |
| `src/components/explore/sun-mark.tsx` | Sin cambios — reutilizado tal cual dentro del `AdvancedMarker` |
| `src/app/explore/page.tsx` | Deja de componer `map: LOUNGE_MAP_POSITIONS[lounge.id]`; los 17 lounges (no solo los 12 de NYC que cubría el mapa de posiciones) aparecen ahora como marker |
| `vitest.setup.ts` | + stub mínimo de `window.google.maps`, construido incrementalmente por TDD (ver "Testing") |
| `docs/design/COMPONENT-MAP.md` | Fila del componente actualizada; desviación anotada (mapa real reemplaza el SVG del artboard, mismo patrón visual) |
| `docs/PENDIENTES.md` | Se cierran las entradas de §2.2/§2.3 sobre proveedor de mapa simulado; se abre una nueva sobre el mini-mapa de perfil de lounge diferido y el rollout de la key a Vercel |

## Interacción y controles

- **Pin**: `AdvancedMarker` con `SunMark` dentro, clic → `onSelect(id)`.
- **Callout**: al seleccionar, un `AdvancedMarker` adicional en las mismas
  coordenadas renderiza `LoungeCallout` (contenido reutilizado, sin la lógica de
  posición manual).
- **Zoom in/out**: mismos `aria-label`, ahora controlan el mapa real vía
  `useMap()`.
- **Recentrar / "mi ubicación"**: usa `getCurrentPosition()` (ya existe en
  `src/lib/geolocation.ts`) para centrar en la ubicación real del usuario, no un
  punto fijo como hoy.
- **Clustering**: `@googlemaps/markerclusterer`, algoritmo y umbral por defecto de
  la librería.

## Tema del mapa y Map ID

`AdvancedMarker` requiere un **Map ID** de Google Cloud Console; el estilo de
tiles se configura ahí (Map Style Editor ligado a ese Map ID), no como JSON
inline en el código. Ya configurado por el usuario:

- Estilo derivado de los tokens existentes en `globals.css` (sin inventar
  colores nuevos): `--map-land` #efe7de, `--map-water` #dce6e6, `--map-park`
  #e3e8d6, `--map-block`/highways #e6dcd0, `--map-street` #ffffff + `--border`
  #e7d9c9 en el borde, etiquetas con `--fg-muted` #55483d y halo `--white`.
- Variables ya en `.env.local` (no committeadas): `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
  `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`.

## Estados de error y offline (dejan de ser simulados)

Hoy `?map=error` y `?offline=1` disparan estados simulados porque "no había
proveedor real que mida nada" (`docs/PENDIENTES.md` §2.2/§2.3). Con Google Maps
real, esa condición ya no aplica — se reemplazan por disparadores reales:

- **Error**: timeout de carga a 3s (AC de la historia: "Map loads within 3
  seconds on good connection") + callback `onError` del `APIProvider`.
- **Offline**: `navigator.onLine` + eventos `online`/`offline`.

Los artboards `MapError.dc.html`/`Offline.dc.html` se conservan como diseño
visual del estado — solo cambia el disparador, no la pantalla. Los tests de
`page.test.tsx` que hoy dependen de los query params se reescriben test-first
para simular las condiciones reales (fallo del stub de `window.google.maps`,
`navigator.onLine = false`) en vez de navegar con query param.

## Testing

El proyecto solo permite mockear `next/navigation`; todo lo demás corre contra
la implementación real (`vitest.setup.ts` ya define un `IntersectionObserver`
inerte, documentado como "rellenar una API del navegador que jsdom no trae... no
sustituye código del proyecto, lo hace ejecutable", no como mock).

El SDK de Google Maps no puede correr en jsdom (necesita red + WebGL/canvas
reales). Se aplica el mismo precedente: un stub mínimo y determinista del
global `window.google.maps` (que normalmente inyecta el `<script>` de Google, no
un módulo del proyecto) — `Map`, `AdvancedMarkerElement`, sistema de eventos
básico. Se construye incrementalmente durante TDD, solo con la superficie que
cada test necesite (red → green → refactor), no de una vez.

Playwright sigue siendo el que verifica visualmente el mapa real (tiles, estilo,
clustering) — uso puntual, no suite e2e masiva, como ya establece el proyecto.

## Verificación antes de dar por terminado

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run dev   # confirmar /explore responde 200 y el mapa carga con el Map ID real
```

Más verificación visual puntual con Playwright del mapa real (pines, callout,
clustering, tema) antes de decir "listo".
