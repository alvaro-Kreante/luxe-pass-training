# LuxePass — Aplicación Next.js + Specs & Diseño

## Qué es este repositorio

Repositorio integral del proyecto **LuxePass** (plataforma de membresía de lujo para el cliente En Soleil, desarrollada por la agencia Kreante). Contiene:

1. **Código de la aplicación** — Next.js 15 + TypeScript + Tailwind + Shadcn/ui + Recharts
2. **Especificaciones** — Historias de usuario y flujos en `/specs`
3. **Diseño** — Mockups y sistema de diseño en `/design`

La app en producción está en `app.luxepass.co`. Este repo es para desarrollo y referencia.

## Estructura

```
src/                      Código de la aplicación Next.js
  app/                    App Router de Next.js (páginas, layouts)
  components/
    ui/                   Componentes Shadcn/ui (Button, Input, Card)
    charts/               Gráficos Recharts (BarChart, LineChart)
  lib/
    utils.ts              Utilidades (cn() para Tailwind)

reference/                Diseño y especificaciones
  design/
    DESIGN-SYSTEM.md      Sistema de diseño: tokens, tipografía, componentes, patrones
    epic-N-slug/          Mockups de un epic: .dc.html + luxepass-epicN.html + canvas.json + logo.png
  specs/
    epic-N-slug/          Un folder por epic (9 en total)
      story-N.M-slug.md   Una historia de usuario por archivo
    flows/
      flow-slug.md        Diagramas de flujo en Mermaid (texto)
      images/             JPGs de los flujos (referencia visual)

assets/
  brand/logo.png          Logo oficial En Soleil (907 KB)

public/                   Assets públicos (manifest.json para PWA, service worker, etc)
```

### Epics (`reference/specs/epic-*`)

9 epics, numerados 1–9, cada uno con sus historias de usuario:

1. User Onboarding & Authentication
2. Location Discovery & Search
3. Lounge Profiles & Details
4. Booking System
5. QR Code & Check-in
6. Member Experience & Notifications
7. Partner Dashboard
8. Admin & Support
9. Membership & Referrals

### Convención de nombres

- Folders y archivos en **lowercase-kebab-case**, sin espacios ni caracteres especiales (`epic-1-user-onboarding-authentication`, `story-1.1-user-registration.md`).
- Los números de story mantienen el punto (`1.1`, `4.2`) tal cual aparecen en la numeración original del proyecto.
- Todas las historias de usuario son `.md`, no `.txt`.

### Formato de una historia de usuario

Cada `story-*.md` sigue esta estructura:

```markdown
# Story N.M: Título

## User Story
As a ... I want ... so that ...

## Acceptance Criteria
- [ ] Criterio 1
- [ ] Criterio 2

## Related Flow
(ver sección siguiente)
```

### Flujos (`reference/specs/flows/`)

Los diagramas de flujo originales (6 JPGs de FigJam) fueron transcritos a **Mermaid** en archivos `.md` para que sean legibles como texto (no requieren visión). Cada flow file cubre uno o más epics, e incluye:

- El diagrama Mermaid completo.
- Una tabla "Story Segments" que indica qué nodos del diagrama corresponden a cada historia de usuario — esto es importante porque **varios diagramas abarcan más de un epic** (ej. `flow-complete-booking-journey.md` cubre Epic 3, Epic 4, Epic 5 y toca Epic 6).
- Notas sobre huecos o inconsistencias encontradas al transcribir (ej. una historia sin nodo dedicado en ningún diagrama).

Cada historia de usuario afectada enlaza de vuelta al flow file relevante en su sección `## Related Flow`, indicando el segmento específico que le corresponde. Si una historia no tiene diagrama asociado, esto se declara explícitamente en esa sección en lugar de omitirla.

Mapeo diagrama → epics:

| Flow file | Epics que cubre |
|---|---|
| `flow-onboarding.md` | Epic 1 (+ nota sobre Story 4.2 y 9.1) |
| `flow-location-discovery-search.md` | Epic 2 |
| `flow-complete-booking-journey.md` | Epic 3, Epic 4, Epic 5, toca Epic 6 |
| `flow-partner-experience.md` | Epic 7 |
| `flow-admin-support-experience.md` | Epic 8 |
| `flow-membership-referrals.md` | Epic 9 |

## Diseño (`reference/design/`)

Mockups de las pantallas de cada epic, hechos con el skill `/design` (canvas multi-artboard).

**Antes de implementar cualquier epic, leer `reference/design/DESIGN-SYSTEM.md`.** Ahí están:
- Tokens de color exactos (Bodoni Moda + Manrope)
- Tipografía y escala
- Componentes especificados con medidas exactas
- Patrones de pantalla (26 en total)

Estos tokens están replicados en el código como **CSS variables** y **Tailwind config**.

**Convenciones de diseño:**
- La copy de la UI va en **inglés**; la documentación en español.
- Tema **híbrido**: claro/boutique para miembro, oscuro/moderno para Partner Dashboard.
- El `logo.png` de cada carpeta es una copia reducida a 54 KB (no copiar desde `assets/brand/`).
- Versionamos `.dc.html` (fuente), `.html` publicable, `canvas.json`, y `logo.png`.
- Los datos de muestra **cuadran**: fecha compartida (12–14 sept), importes coherentes entre fases.

**Los números de fase no son cronológicos** — Fase 2 es Epic 7, aunque se diseñó después de Fase 7.

Estado: **diseñados los 9 epics**. La Fase 9 cerró; cualquier trabajo nuevo es revisión o corrección.

## Al editar specs (`reference/specs/`)

- Mantener la convención de nombres en minúsculas y con guiones.
- Si se agrega una historia de usuario nueva, seguir el formato de sección `## User Story` / `## Acceptance Criteria` / `## Related Flow` de las demás.
- Si una historia no tiene flujo asociado, decirlo explícitamente en `## Related Flow` en vez de omitir la sección o inventar un enlace.
- Si se actualiza un diagrama Mermaid en `reference/specs/flows/`, revisar la tabla "Story Segments" para que siga siendo consistente.

## Stack tecnológico

**Aplicación:**
- **Next.js 15.1** — App Router, SSR, PWA support
- **TypeScript** — Type-safe
- **Tailwind CSS 4** — Utility-first, con tokens del DESIGN-SYSTEM.md como variables CSS
- **Shadcn/ui** — Componentes accesibles base (Button, Input, Card)
- **Recharts** — Gráficos interactivos (Bar, Line, etc)
- **@ducanh2912/next-pwa** — Progressive Web App (service worker, offline caching)

**Convenciones de código:**
- Componentes en `src/components/` con estructura por tipo (ui/, charts/, etc)
- Tipos TypeScript importados desde `@/lib/utils` o del componente
- Sin comentarios innecesarios — el código auto-documenta con nombres claros
- Transiciones CSS: 150ms ease (token `--transition-default`)

**Comandos:**
```bash
npm run dev      # Dev server en http://localhost:3000
npm run build    # Build producción (genera SW para PWA)
npm run start    # Sirve la build
npm run lint     # ESLint
```
