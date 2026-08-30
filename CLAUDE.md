# LuxePass — Aplicación Next.js + Specs & Diseño

## Qué es este repositorio

Repositorio integral del proyecto **LuxePass** (plataforma de membresía de lujo para el cliente En Soleil, desarrollada por la agencia Kreante). Contiene:

1. **Código de la aplicación** — Next.js 15 + TypeScript + Tailwind 4
2. **Especificaciones** — Historias de usuario y flujos en `docs/specs`
3. **Diseño** — Mockups y sistema de diseño en `docs/design`

---

## ⚠️ Alcance: esto es SOLO frontend

**Este repo implementa el diseño en Next.js. No hay backend, no hay base de datos, no hay lógica de negocio real.**

La app en producción vive en `app.luxepass.co` y es un proyecto aparte: este repositorio **no se conecta a ella** ni a ningún servicio.

**No hacer, salvo que se pida explícitamente:**

- ❌ Instalar ORM o cliente de base de datos (Prisma, Drizzle, Supabase…)
- ❌ Crear route handlers en `src/app/api/`
- ❌ Añadir autenticación real (NextAuth, sesiones, JWT, middleware de auth)
- ❌ Server Actions que escriban en algún sitio
- ❌ `fetch` a servicios externos, pasarelas de pago, envío de emails
- ❌ Tests unitarios o e2e (no hay suite y no se pidió una)
- ❌ Persistir estado (`localStorage`, `sessionStorage`, cookies). Recargar puede empezar de cero: es un mockup navegable, no una app con sesión

**Sí hacer:**

- ✅ Datos de muestra en módulos de `src/lib/` o constantes del propio componente
- ✅ Estado de UI con `useState` / Context — lo justo para que la pantalla muestre sus estados
- ✅ Validación **de cliente**, cuya finalidad es que la pantalla pueda mostrar sus estados (error, botón deshabilitado, campo inválido) — no es seguridad
- ✅ Navegación entre pantallas con `next/link` y `useRouter`

**Criterios de aceptación que exigirían backend** (enviar un email, cobrar, verificar un token, comprobar duplicados contra la base) se cubren **visualmente**: se implementa la pantalla del estado y se simula el disparador con datos de muestra. La desviación se anota en la última sección de `docs/design/COMPONENT-MAP.md`.

Ejemplos ya hechos: la comprobación de email duplicado consulta una lista de dos correos en `src/lib/registration.ts`; el bloqueo tras 5 intentos de `/login` es un contador en `useState` que se limpia al recargar. **La regla es que la pantalla llegue a mostrar el estado, no que el estado sea real.**

---

## Estado de implementación

**Diseño: los 9 epics están diseñados** (Fase 9 cerrada). Cualquier trabajo de diseño nuevo es revisión o corrección.

**Código: 2 de 24 historias implementadas** — el Epic 1 está completo.

| Epic | Historias | Estado |
|---|---|---|
| 1 · User Onboarding & Authentication | 1.1 User registration | ✅ **Implementada** |
| | 1.2 User login & authentication | ✅ **Implementada** |
| 2 · Location Discovery & Search | 2.1 · 2.2 · 2.3 | ⬜ Pendiente |
| 3 · Lounge Profiles & Details | 3.1 · 3.2 | ⬜ Pendiente |
| 4 · Booking System | 4.1 · 4.2 · 4.3 | ⬜ Pendiente |
| 5 · QR Code & Check-in | 5.1 · 5.2 · 5.3 | ⬜ Pendiente |
| 6 · Member Experience & Notifications | 6.1 · 6.2 · 6.3 | ⬜ Pendiente |
| 7 · Partner Dashboard | 7.1 · 7.2 · 7.3 | ⬜ Pendiente |
| 8 · Admin & Support | 8.1 · 8.2 · 8.3 | ⬜ Pendiente |
| 9 · Membership & Referrals | 9.1 · 9.2 | ⬜ Pendiente |

### Rutas existentes

| Ruta | Artboard | Story |
|---|---|---|
| `/` | — | Índice **provisional** de pantallas. Lo sustituye el Home del App shell (patrón 3) en el Epic 2 |
| `/signup` | `Main.dc.html` + `Terms.dc.html` | 1.1 |
| `/verify-email` | `Verification.dc.html` | 1.1 |
| `/onboarding/basics` | `ProfileBasic.dc.html` | 1.1 |
| `/onboarding/personal` | `ProfilePersonal.dc.html` | 1.1 |
| `/onboarding/professional` | `ProfileProfessional.dc.html` | 1.1 |
| `/welcome` | `Welcome.dc.html` | 1.1 |
| `/login` | `Login.dc.html` | 1.2 |
| `/forgot-password` | `ForgotPassword.dc.html` | 1.2 |

Los 10 artboards de la Fase 1 están cubiertos salvo `Home.dc.html`, que es el App shell (patrón 3) y entra con el Epic 2.

Lo construido en el Epic 1 que ya sirve al resto: 12 primitivos, 3 patrones de pantalla y la capa de tokens completa. Ver `docs/design/COMPONENT-MAP.md`.

**Cada artboard tiene su propia frase de marca** en el panel izquierdo del patrón 1 (`Join a community of discerning travelers.`, `Your next moment of calm is waiting.`, `Tell us who you are.`…). No reutilizar la de otra pantalla: extraerla del `.dc.html` correspondiente.

---

## Cómo implementar la siguiente historia

### Ramas

| Rama | Para qué |
|---|---|
| `main` | Rama principal. No se trabaja directamente sobre ella |
| `design/screens` | **Las pantallas implementadas en Next.js.** Aquí va todo el código |
| `docs/design` | Mockups `.dc.html` y canvas de los epics (`docs/design/`) |

Las dos ramas `design/*` son el mismo trabajo en dos formatos: el canvas estático y
las pantallas navegables. No se llama "frontend" a propósito — esto es el diseño
llevado a código, no una aplicación con backend.


Receta completa. Seguirla en orden evita duplicar componentes que ya existen.

**1. Leer la historia** — `docs/specs/epic-N-slug/story-N.M-slug.md`. Sus `## Acceptance Criteria` son el contrato.

**2. Leer el flujo** que la historia enlaza en `## Related Flow`, en `docs/specs/flows/`. La tabla "Story Segments" dice qué nodos del diagrama le corresponden.

**3. Leer la fase de diseño** en `docs/design/DESIGN-SYSTEM.md` §6. **Ojo: los números de fase no coinciden con los de epic** (la Fase 2 es el Epic 7). La tabla de §6 dice qué artboards tiene cada fase y qué criterios cubren.

**4. Leer los artboards** `.dc.html` de esa carpeta. Son HTML real con los estilos inline: son la fuente de verdad de medidas y copy, no una aproximación.

**5. Leer `docs/design/COMPONENT-MAP.md`** — qué componentes existen, qué falta, y la tabla de "gemelos" que el design system ya declaró equivalentes entre tema claro y oscuro.

**6. Implementar** en este orden de preferencia:
   1. Reutilizar un componente existente tal cual
   2. Añadirle una variante (`cva`)
   3. Solo si nada encaja, crear uno nuevo — y anotarlo en el mapa

**7. Actualizar `COMPONENT-MAP.md`**: la fila de cada componente nuevo, las rutas nuevas en la capa 3, y las desviaciones respecto al artboard.

**8. Verificar antes de dar nada por hecho:**
```bash
npx tsc --noEmit     # debe salir vacío
npm run lint         # debe salir sin problemas
npm run build        # debe compilar y listar las rutas nuevas
npm run dev          # y comprobar que las rutas responden 200
```

Se pueden correr a la vez: `next build` escribe en `.next-build` y `next dev` en
`.next`, así que un build no invalida el dev server (ver `next.config.ts`).

**9. Revisar `docs/PENDIENTES.md`**: añadir lo que quede abierto (algo provisional,
un asset que falte, un criterio que solo se pueda enunciar) y cerrar lo resuelto.

### Correspondencia specs ↔ diseño

Los nombres de carpeta coinciden **salvo en el Epic 1**:

| Epic | `docs/specs/` | `docs/design/` | Fase |
|---|---|---|---|
| 1 | `epic-1-user-onboarding-authentication` | `epic-1-onboarding` ⚠️ | 1 |
| 2 | `epic-2-location-discovery-search` | idem | 3 |
| 3 | `epic-3-lounge-profiles-details` | idem | 4 |
| 4 | `epic-4-booking-system` | idem | 5 |
| 5 | `epic-5-qr-code-check-in` | idem | 6 |
| 6 | `epic-6-member-experience-notifications` | idem | 7 |
| 7 | `epic-7-partner-dashboard` | idem | 2 |
| 8 | `epic-8-admin-support` | idem | 8 |
| 9 | `epic-9-membership-referrals` | idem | 9 |

### Qué NO tocar

- **Los `## Acceptance Criteria` de los specs.** Son el contrato del cliente: no marcar sus checkboxes ni reescribirlos al implementar.
- **Los artboards `.dc.html`.** Son la fuente de diseño; si algo no cuadra, se anota como desviación en el mapa, no se edita el mockup.
- **La paleta literal de `globals.css`** (§2 del design system) sin actualizar antes el design system.

---

## Al implementar una pantalla

**Antes de crear cualquier componente, leer `docs/design/COMPONENT-MAP.md`.** Después de crear uno, añadir su fila.

Cuatro capas, de abajo arriba:

```
Capa 0  tokens        src/app/globals.css        §2 Tokens · §3 Tipografía
Capa 1  primitivos    src/components/ui/         §4 Componentes
Capa 2  patrones      src/components/patterns/   §5 Patrones de pantalla
Capa 3  pantallas     src/app/**/page.tsx        solo componen
```

- **Una pantalla no escribe un `px` ni un `#hex`.** Si necesita algo que no existe, se sube a capa 1 o 2 y se anota en el mapa.
- Los componentes consumen **tokens semánticos** (`bg-surface`, `text-fg-muted`, `border-line`), no literales (`bg-gold-500`). Los literales quedan para cuando el design system cita el valor exacto (mapa, gradientes de marca).
- **Un solo componente para los dos temas.** El shell pone `data-theme="dark"` y los tokens resuelven en la mitad oscura. Lo que el tema no resuelve son las diferencias de geometría entre gemelos (input 44 vs 50px): esas van como variante explícita.
- Los artboards son desktop 1440×900. La app es responsive; las desviaciones conscientes se documentan en la última sección del mapa.
- La lógica específica de un epic va en `src/components/<epic>/` (p. ej. `onboarding/`), no en `ui/` ni en `patterns/`.

---

## Estructura

```
src/                      Código de la aplicación Next.js
  app/
    globals.css           Tokens: literales + semánticos + @theme inline
    **/page.tsx           Pantallas — solo componen, no definen estilo
  components/
    ui/                   Primitivos = DESIGN-SYSTEM §4 (Button, Input, Chip, Card...)
    patterns/             Layouts   = DESIGN-SYSTEM §5 (AuthSplit, Modal...)
    onboarding/           Lógica del Epic 1 (TermsModal, ProfileDraft)
    charts/               Gráficos Recharts (BarChart, LineChart)
  lib/
    utils.ts              Utilidades (cn() para Tailwind)
    registration.ts       Reglas de validación de alta (Story 1.1)

docs/                     Diseño y especificaciones
  PENDIENTES.md           Lo que queda abierto: bloqueos, provisionales y decisiones
  design/
    DESIGN-SYSTEM.md      Sistema de diseño: tokens, tipografía, componentes, patrones
    COMPONENT-MAP.md      Qué componente de código implementa qué fila del design system
    epic-N-slug/          Mockups de un epic: .dc.html + luxepass-epicN.html + canvas.json + logo.png
  specs/
    epic-N-slug/          Un folder por epic (9 en total)
      story-N.M-slug.md   Una historia de usuario por archivo
    flows/
      flow-slug.md        Diagramas de flujo en Mermaid (texto)
      images/             JPGs de los flujos (referencia visual)

assets/
  brand/logo.png          Logo oficial En Soleil (907 KB)

public/
  logo.png                Copia reducida (54 KB) que consume la app
  manifest.json, sw.js    PWA (sw.js y workbox-*.js se regeneran en cada build)
```

### Epics (`docs/specs/epic-*`)

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

### Flujos (`docs/specs/flows/`)

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

## Diseño (`docs/design/`)

Mockups de las pantallas de cada epic, hechos con el skill `/design` (canvas multi-artboard).

**Antes de implementar cualquier epic, leer `docs/design/DESIGN-SYSTEM.md`.** Ahí están:
- Tokens de color exactos (Bodoni Moda + Manrope)
- Tipografía y escala
- Componentes especificados con medidas exactas (§4)
- Patrones de pantalla (§5, 26 en total)
- Qué artboards tiene cada fase y qué criterios cubren (§6)

Estos tokens están replicados en el código como **CSS custom properties** en `src/app/globals.css`, expuestas a Tailwind con `@theme inline`.

**Convenciones de diseño:**
- La copy de la UI va en **inglés**; la documentación en español.
- Tema **híbrido**: claro/boutique para miembro, oscuro/moderno para Partner Dashboard y Admin.
- El `logo.png` de cada carpeta es una copia reducida a 54 KB (no copiar desde `assets/brand/`).
- Versionamos `.dc.html` (fuente), `.html` publicable, `canvas.json`, y `logo.png`.
- Los datos de muestra **cuadran**: fecha compartida (12–14 sept), importes coherentes entre fases. Mantener esa coherencia al implementar.

**Los números de fase no son cronológicos** — Fase 2 es Epic 7, aunque se diseñó después de Fase 7.

## Al editar specs (`docs/specs/`)

- Mantener la convención de nombres en minúsculas y con guiones.
- Si se agrega una historia de usuario nueva, seguir el formato de sección `## User Story` / `## Acceptance Criteria` / `## Related Flow` de las demás.
- Si una historia no tiene flujo asociado, decirlo explícitamente en `## Related Flow` en vez de omitir la sección o inventar un enlace.
- Si se actualiza un diagrama Mermaid en `docs/specs/flows/`, revisar la tabla "Story Segments" para que siga siendo consistente.

## Stack tecnológico

- **Next.js 15.1** — App Router, PWA
- **TypeScript**
- **Tailwind CSS 4** — **No hay `tailwind.config.ts`**: v4 no lee configs JS. El tema vive en `@theme inline` dentro de `src/app/globals.css`
- **Radix UI** — primitivas accesibles (Dialog, Select, Popover, DropdownMenu, Form)
- **lucide-react** — iconos, con `strokeWidth={1.6}` para cumplir §1 del design system
- **class-variance-authority** — variantes de componente
- **Recharts** — gráficos (Epic 7 y 8, aún sin usar)
- **@ducanh2912/next-pwa** — service worker

**Convenciones de código:**
- Componentes en `src/components/` con estructura por capa (ui/, patterns/, charts/) más una carpeta por epic para su lógica
- Sin comentarios innecesarios — el código auto-documenta con nombres claros. Sí comentar de qué artboard sale una pantalla y qué fila del design system implementa un componente
- Transiciones CSS: 150ms ease
- Variantes con `class-variance-authority`, no con condicionales de string sueltos

**Comandos:**
```bash
npm run dev      # Dev server en http://localhost:3000   → escribe en .next
npm run build    # Build producción (genera SW para PWA) → escribe en .next-build
npm run start    # Sirve la build desde .next-build
npm run lint     # ESLint
npx tsc --noEmit # Comprobación de tipos
```

**Directorios de salida separados** (`distDir` en `next.config.ts`). Compartiendo
`.next`, un build lanzado mientras el dev server está vivo le reescribe los chunks
por debajo y lo deja sirviendo 500 (`__webpack_modules__[moduleId] is not a
function`) o 404 en rutas que existen — sin avisar en su log. Si alguna vez vuelve
a pasar: `rm -rf .next` y reiniciar el dev server.
