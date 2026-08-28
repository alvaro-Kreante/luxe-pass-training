# LuxePass — Repositorio de documentación y specs

## Qué es este repositorio

Este repo **no contiene código de aplicación** — es la documentación de referencia del proyecto **LuxePass** (plataforma de membresía de lujo para el cliente En Soleil, desarrollada por la agencia Kreante). La app ya fue entregada y está en producción en `app.luxepass.co`. Este repositorio se usa para archivar y estructurar los epics, historias de usuario y flujos del proyecto con fines de referencia/aprendizaje.

No hay `package.json`, build ni tests que ejecutar aquí.

## Estructura

```
docs/                    Documentación original del cliente/proyecto (briefs, planning, retrospectiva, assets de diseño, CSVs de Trello/planning). NO versionado — solo consulta local.
assets/
  brand/logo.png          Logo oficial En Soleil (el que se usa en los diseños)
design/
  DESIGN-SYSTEM.md        Sistema de diseño: tokens, tipografía, componentes, patrones, fases
  epic-N-slug/            Mockups de un epic: un .dc.html por pantalla + canvas.json + logo.png
                          + luxepass-epicN-slug.html (canvas publicable generado, no editar a mano)
specs/
  epic-N-slug/            Un folder por epic (9 en total)
    story-N.M-slug.md     Una historia de usuario por archivo
  flows/
    flow-slug.md          Diagramas de flujo en Mermaid (texto), uno por diagrama fuente
    images/               JPGs originales de los flujos (referencia visual para humanos)
```

### Epics (`specs/epic-*`)

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

### Flujos (`specs/flows/`)

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

## Diseño (`design/`)

Mockups de las pantallas de cada epic, hechos con el skill `/design` (canvas multi-artboard
publicado como Artifact). Cada pantalla es un `.dc.html`; `canvas.json` los distribuye.

**Antes de diseñar cualquier epic, leer `design/DESIGN-SYSTEM.md`.** Ahí están los tokens de
color exactos, la tipografía, las medidas de los componentes y los patrones de pantalla ya
fijados — no se reinventan por epic, se extienden. Reglas que se aplican siempre:

- La copy de la UI va en **inglés**; la documentación en español.
- Tema **híbrido**: claro/boutique para las pantallas de miembro, oscuro/moderno para el
  Partner Dashboard, compartiendo tokens y tipografía.
- Los mockups `login.jpg` / `registration.jpg` del cliente son la **pauta principal**, no una
  inspiración.
- Cada pantalla debe cubrir los criterios de aceptación de su historia en `specs/`.

Al terminar una fase, actualizar la tabla de fases de `DESIGN-SYSTEM.md` con el link del canvas.

## Al editar specs

- Mantener la convención de nombres en minúsculas y con guiones.
- Si se agrega una historia de usuario nueva, seguir el formato de sección `## User Story` / `## Acceptance Criteria` / `## Related Flow` de las demás.
- Si una historia no tiene flujo asociado, decirlo explícitamente en `## Related Flow` en vez de omitir la sección o inventar un enlace.
- Si se actualiza un diagrama Mermaid, revisar la tabla "Story Segments" del flow file para que siga siendo consistente.
