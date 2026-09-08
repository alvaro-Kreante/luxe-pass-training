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

**Excepción:** Supabase está habilitado **solo localmente** (rama `chore/supabase-local-setup` adelante) para desarrollo. No se conecta a producción ni a servicios externos. Ver "Supabase Local Development" más abajo.

**No hacer, salvo que se pida explícitamente:**

- ❌ Instalar ORM o cliente de base de datos (Prisma, Drizzle) **excepto** Supabase local
- ❌ Conectarse a Supabase en producción o a cualquier proyecto remoto
- ❌ Crear route handlers en `src/app/api/`
- ❌ Añadir autenticación real (NextAuth, sesiones, JWT, middleware de auth)
- ❌ Server Actions que escriban en algún sitio
- ❌ `fetch` a servicios externos, pasarelas de pago, envío de emails
- ❌ Tests e2e con navegador masivos — Playwright existe para verificación visual (uso puntual, ver §Verificación)
- ❌ Persistir estado (`localStorage`, `sessionStorage`, cookies). Recargar puede empezar de cero: es un mockup navegable, no una app con sesión

**Sí hacer:**

- ✅ Datos de muestra en módulos de `src/lib/` o constantes del propio componente
- ✅ Estado de UI con `useState` / Context — lo justo para que la pantalla muestre sus estados
- ✅ Validación **de cliente**, cuya finalidad es que la pantalla pueda mostrar sus estados (error, botón deshabilitado, campo inválido) — no es seguridad
- ✅ Navegación entre pantallas con `next/link` y `useRouter`
- ✅ Tests con Vitest + Testing Library, escritos **antes** del código — ver "Metodología de test"

**Criterios de aceptación que exigirían backend** (enviar un email, cobrar, verificar un token, comprobar duplicados contra la base) se cubren **visualmente**: se implementa la pantalla del estado y se simula el disparador con datos de muestra. La desviación se anota en la última sección de `docs/design/COMPONENT-MAP.md`.

Ejemplos ya hechos: la comprobación de email duplicado consulta una lista de dos correos en `src/lib/registration.ts`; el bloqueo tras 5 intentos de `/login` es un contador en `useState` que se limpia al recargar. **La regla es que la pantalla llegue a mostrar el estado, no que el estado sea real.**

---

## Estado de implementación

**Diseño y código: completos.** Los 9 epics (24 historias) están implementados y
diseñados. `git log` tiene el historial por epic; `docs/specs/` lista las historias
por nombre. Trabajo a partir de aquí es bugfix, refactor o una historia adicional
fuera del alcance original — sigue "Cómo implementar una historia nueva" más abajo.

### Rutas existentes

La tabla completa ruta → artboard → story vive en `docs/design/COMPONENT-MAP.md`
(capa 3). Es la fuente única: no duplicarla aquí.

Varias pantallas reúnen varios artboards de una fase como estados de la misma
vista, alcanzados por query param cuando dependen del sistema o de una lógica
que aquí no existe (`?covered=1`, `?map=error`, `?state=today`…). El detalle de
qué estado usa qué param está en `docs/PENDIENTES.md` §2.2 (estados de
`/explore`) y en la tabla de desviaciones de `COMPONENT-MAP.md` (estados de
`/my-pass/[reference]`, de `/lounges/[id]/book`, etc.).

**Cada artboard tiene su propia frase de marca** en el panel izquierdo del patrón 1 (`Join a community of discerning travelers.`, `Your next moment of calm is waiting.`, `Tell us who you are.`…). No reutilizar la de otra pantalla: extraerla del `.dc.html` correspondiente.

---

## Cómo implementar una historia nueva

### Ramas

| Rama | Para qué |
|---|---|
| `main` | Rama principal. No se trabaja directamente sobre ella |
| `design/screens` | **Las pantallas implementadas en Next.js.** Aquí va todo el código |
| `docs/design` | Mockups `.dc.html` y canvas de los epics (`docs/design/`) |

Las dos ramas `design/*` son el mismo trabajo en dos formatos: el canvas estático y
las pantallas navegables. No se llama "frontend" a propósito — esto es el diseño
llevado a código, no una aplicación con backend.

Para trabajo puntual que no es una historia entera, se sale de `design/screens` con
un prefijo y se vuelve a ella:

| Prefijo | Cuándo |
|---|---|
| `feat/` | Pantalla o funcionalidad nueva |
| `fix/` | Corrección de un fallo |
| `refactor/` | Reestructurar sin cambiar comportamiento |
| `test/` | Solo añadir o actualizar tests |
| `chore/` | Tooling, dependencias, configuración |
| `docs/` | Solo documentación |

Formato: `<prefijo>/<descripción-en-kebab>` — minúsculas, guiones, sin más barras
que la del prefijo (`feat/lounge-search`, `fix/login-lockout-plural`).

**Una rama = un propósito.** Si aparece trabajo no relacionado a mitad de tarea, va
en otra rama. Los mensajes de commit siguen Conventional Commits (`feat:`, `fix:`,
`docs:`, `chore:`…), como los que ya hay en el historial.


Receta completa. Seguirla en orden evita duplicar componentes que ya existen.

**1. Leer la historia** — `docs/specs/epic-N-slug/story-N.M-slug.md`. Sus `## Acceptance Criteria` son el contrato.

**2. Leer el flujo** que la historia enlaza en `## Related Flow`, en `docs/specs/flows/`. La tabla "Story Segments" dice qué nodos del diagrama le corresponden.

**2.1. Si la historia toca Supabase, leer `docs/DATA-MODEL-MAP.md`** — dice qué epic es dueño de cada tabla candidata y qué cruces con otros epics ya se anticiparon, para no rediseñar una FK o duplicar una tabla que otro epic ya reclama.

**3. Leer la fase de diseño** en `docs/design/DESIGN-SYSTEM.md` §6. **Ojo: los números de fase no coinciden con los de epic** (la Fase 2 es el Epic 7). La tabla de §6 dice qué artboards tiene cada fase y qué criterios cubren.

**4. Leer los artboards** `.dc.html` de esa carpeta. Son HTML real con los estilos inline: son la fuente de verdad de medidas y copy, no una aproximación.

**5. Leer `docs/design/COMPONENT-MAP.md`** — qué componentes existen, qué falta, y la tabla de "gemelos" que el design system ya declaró equivalentes entre tema claro y oscuro.

**6. Implementar con TDD** — red, green, refactor. Ver "Metodología de test". El
test se escribe **antes** y sale de los criterios del paso 1 y de los nodos del
paso 2, nunca del artboard del paso 4.

   Para los componentes, en este orden de preferencia:
   1. Reutilizar un componente existente tal cual
   2. Añadirle una variante (`cva`)
   3. Solo si nada encaja, crear uno nuevo — y anotarlo en el mapa

**7. Actualizar `COMPONENT-MAP.md`**: la fila de cada componente nuevo, las rutas nuevas en la capa 3, y las desviaciones respecto al artboard.

**8. Verificar antes de dar nada por hecho:**
```bash
npm test             # toda la suite en verde, sin tests omitidos
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

### Nunca inventar un diseño

**Cada pantalla de este proyecto tiene su artboard.** Construir algo "provisional",
un "scaffold" o una maqueta propia está prohibido, también para pantallas internas.
La fase actual es convertir mockups en código, no diseñar en el editor.

Si no aparece el `.dc.html` de la pantalla que toca construir:

1. **Parar. No inventar un diseño.**
2. Preguntar dónde está el artboard, o si se acepta avanzar sin él.
3. Continuar solo con confirmación explícita.

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

## Metodología de test — TDD

Toda historia nueva y todo bugfix siguen **Test-Driven Development** vía la
skill `test-driven-development` (obligatoria, se invoca antes de tocar
código): red → green → refactor, ciclo estándar que la skill ya cubre. Lo
específico de este proyecto:

- **El test sale de los `## Acceptance Criteria` de la historia y de los
  nodos del flow — nunca del `.dc.html`.** Copy, medidas, colores y clases de
  Tailwind no se testean: eso lo cubren el artboard, `tsc` y la revisión
  visual. Documentación, configuración sin efecto en el comportamiento y
  ajustes puramente visuales tampoco llevan test.
- **Bugs**: se reproduce antes de arreglar. El test que falla confirma el
  diagnóstico; el mismo test en verde queda de guardia contra la regresión.
- Se consulta siempre por rol y etiqueta (`getByRole`, `getByLabelText`),
  nunca por clase ni estructura del DOM.
- `userEvent.setup({ delay: null })` siempre — sin esto la suite completa se
  va de 3,8 s a 19,8 s por la espera de un tick entre cada pulsación.
- **`next/navigation` es el único mock permitido** (el router de Next no
  existe fuera del runtime del App Router). Todo lo demás corre contra la
  implementación real. Rellenar una API del navegador que jsdom no trae
  (`vitest.setup.ts` define un `IntersectionObserver` inerte) no cuenta como
  mock: no sustituye código del proyecto, lo hace ejecutable.
- Punto de partida para una pantalla nueva: `src/app/login/page.test.tsx` y
  `src/app/signup/page.test.tsx` (este último incluye el patrón para un modal
  de Radix). Los `describe` agrupan por comportamiento, no por componente.

---

## Skills

| Skill | Cuándo se usa |
|---|---|
| `test-driven-development` | **Antes de cualquier historia o bugfix.** Red → green → refactor |
| `frontend-design` | Componer pantallas y componentes de UI |
| `design` | Crear o re-sembrar un canvas de mockups `.dc.html` |
| `systematic-debugging` | Algo falla y la causa no es evidente |
| `verification-before-completion` | Antes de dar una historia por terminada |
| `supabase` | **Antes de cualquier cambio de schema o comando de Supabase.** Ver "Supabase Local Development" |

---

## Estructura

Las 4 capas (`src/app/globals.css` → `components/ui/` → `components/patterns/` →
`app/**/page.tsx`) se explican en "Al implementar una pantalla". Dentro de
`components/` hay además una carpeta por epic para su lógica propia
(`onboarding/`, `explore/`, `lounges/`, `booking/`, `passes/`, `account/`,
`charts/`) y en `src/lib/` un módulo de datos de muestra por historia — para
qué historia cubre cada uno, `git log` sobre el archivo o su cabecera son más
fiables que una lista aquí, que se desactualiza con cada historia nueva.

Puntos no derivables del árbol:

- `logo.png` en cada carpeta de `docs/design/epic-N-slug/` y en `public/` son
  copias reducidas (54 KB); el original de 907 KB vive en `assets/brand/`, no
  se copia de ahí directamente.
- `sw.js` y `workbox-*.js` en `public/` se regeneran en cada build — no
  editarlos a mano.
- `scripts/playwright/` es para verificación visual puntual, no una suite e2e
  masiva — ver su `README.md`.
- `docs/PENDIENTES.md` es la lista viva de bloqueos, provisionales y
  decisiones abiertas; revisarla al cerrar cualquier historia (paso 9 de la
  receta).
- `docs/DATA-MODEL-MAP.md` es el mapa liviano de qué tabla de Supabase es
  dueña de cada epic y qué cruces hay entre epics — no lista columnas ni RLS,
  eso se decide historia por historia (paso 2.1 de la receta).

### Flujos (`docs/specs/flows/`)

Los diagramas de flujo viven como Mermaid en `docs/specs/flows/*.md`. Cada uno
cubre uno o más epics y trae una tabla "Story Segments" — qué nodos
corresponden a cada historia — porque varios diagramas abarcan más de un epic
(ej. `flow-complete-booking-journey.md` cubre Epic 3, 4, 5 y toca el 6).

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

## Stack tecnológico

- **Next.js 15.1** — App Router, PWA
- **TypeScript**
- **Tailwind CSS 4** — **No hay `tailwind.config.ts`**: v4 no lee configs JS. El tema vive en `@theme inline` dentro de `src/app/globals.css`
- **Radix UI** — primitivas accesibles (Dialog, Select, Popover, DropdownMenu, Form)
- **lucide-react** — iconos, con `strokeWidth={1.6}` para cumplir §1 del design system
- **class-variance-authority** — variantes de componente
- **Recharts** — gráficos (`components/charts/`: BarChart, LineChart), para Epic 7 y 8
- **@ducanh2912/next-pwa** — service worker
- **Vitest + Testing Library** — tests sobre jsdom, con `next/navigation` mockeado
- **Playwright** — navegador automatizado para verificación visual (uso puntual, no suite e2e masiva)

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
npm test         # Vitest, una pasada
npm run test:watch # Vitest en watch — el ciclo rojo-verde del TDD
npm run test:ui  # El mismo watch, con panel en el navegador
npm run lint     # ESLint
npx tsc --noEmit # Comprobación de tipos
```

**Verificación visual con Playwright:**
Playwright está instalado y disponible para verificación visual puntual: cuando hagas cambios en pantallas, yo puedo navegar a las rutas con Playwright, tomar screenshots y compararlos visualmente contra el diseño para detectar errores. Se usa **solo cuando es necesario** (algo se ve raro, antes de decir "listo"), no para cada cambio. Los tests siguen siendo Vitest + Testing Library (jsdom). Playwright no sustituye la suite de tests, la complementa para verificaciones visuales que jsdom no captura.

Scripts y screenshots se guardan organizados en `scripts/playwright/`: lee `scripts/playwright/README.md` para estructura y cómo crear un script de verificación.

**Directorios de salida separados** (`distDir` en `next.config.ts`): `.next-build`
para producción, `.next` para dev, para que un build no invalide el dev server.

**Antes de dar por roto algo de una pantalla, comprobar que el dev server sirve
React**: `.next` puede quedarse sin `main-app.js`, y entonces la página **se ve
entera pero no responde a nada** (la pinta el servidor; ningún botón, modal ni
drawer funciona porque viven en portales que necesitan JS). Se parece a "falta
implementar esa pantalla" y no lo es.

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/_next/static/chunks/main-app.js   # 200 = sano
```

Si da 404: parar el dev server, `rm -rf .next`, arrancarlo otra vez y **recargar
duro en el navegador** (Ctrl+Shift+R). Detalle y causa en `docs/PENDIENTES.md` §4.2.

---

## Supabase Local Development

**REGLA CRÍTICA:** Todo lo que toque Supabase o la base de datos usa **el proyecto local** (Docker, vía Supabase CLI). Este proyecto **nunca se enlaza** (`supabase link`) a un proyecto remoto ni se ejecuta `supabase db push`/`supabase db pull` sin `--local` — esos comandos actúan sobre un proyecto remoto enlazado, no sobre el Docker local. Si en algún momento hace falta enlazar un proyecto remoto, **parar y pedir confirmación explícita** antes de correr `supabase link`.

### Verificar que usas el proyecto local

Antes de cualquier comando de Supabase, confirma:

```bash
supabase status              # "API URL" debe ser http://127.0.0.1:54331 (puerto de [api] en config.toml)
cat .env.local                # NEXT_PUBLIC_SUPABASE_URL debe apuntar a ese mismo 127.0.0.1:54331
```

Si `.env.local` o cualquier variable apunta a `*.supabase.co`, **parar inmediatamente** — no ejecutar nada hasta confirmar que se volvió a local.

`.env.local` está en `.gitignore` (vía `supabase/.gitignore` y el `.gitignore` raíz): nunca comitear claves, ni siquiera las de local.

### Schema management: Declarative Schemas obligatorio

Este proyecto usa **Declarative Schemas** (nunca migraciones escritas a mano, nunca SQL suelto vía `execute_sql`/`db query` para cambios de esquema). Ya configurado en `supabase/config.toml`:

```toml
[db.migrations]
schema_paths = ["./schemas/*.sql"]   # fuente de verdad — no volver a [] ni borrar sin confirmación
```

`supabase/schemas/` es la carpeta (ya creada, vacía hasta el primer schema) donde vive el estado **final y completo** deseado de cada tabla/vista/función — no el historial de cambios, eso lo generan las migraciones.

### Flujo de trabajo para cambios de schema

**1. Iniciar Supabase local (si no está corriendo):**
```bash
supabase start
```

**2. Editar el esquema deseado** en `supabase/schemas/*.sql` (un archivo por entidad es buena práctica, p. ej. `members.sql`). Editar **solo estos archivos** — cambios hechos a mano en Studio o vía SQL editor son invisibles para el diff.

Antes de nombrar una tabla o FK nueva, revisar `docs/DATA-MODEL-MAP.md`: dice qué epic es su dueño y qué otros epics ya la referencian, para no duplicarla ni romper un cruce ya anticipado.

```sql
-- supabase/schemas/members.sql
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

create policy "select own data" on public.members
  for select to authenticated
  using ( (select auth.uid()) = id );
```

**3. Generar la migración** comparando los schema files contra las migraciones existentes:

```bash
supabase db diff --local -f add_members_table
```

Esto escribe un archivo nuevo en `supabase/migrations/` — nunca crear ni editar ese archivo a mano.

**4. Revisar el archivo generado** antes de aplicar nada:
- ✅ No hay `DROP`/`ALTER` destructivos inesperados
- ✅ RLS y policies están presentes para cada tabla nueva
- ✅ Tipos, defaults e índices son los que se querían

**5. Aplicar la migración al Docker local:**

```bash
supabase migration up      # aplica solo las migraciones pendientes
# o, si se necesita repartir desde cero (borra datos):
# supabase db reset
```

**6. Verificar y comitear:**
```bash
supabase db advisors        # revisar warnings de seguridad/performance
npm run dev                 # confirmar que la app sigue compilando
```
Comitear tanto el/los archivo(s) de `supabase/schemas/` como la migración generada en `supabase/migrations/` — ambos son código versionado, ninguno es descartable.

### Comandos básicos de Supabase local

| Comando | Qué hace |
|---|---|
| `supabase start` | Levanta Supabase local en Docker |
| `supabase stop` | Para los contenedores locales |
| `supabase status` | Estado y URLs/puertos (API 54331, DB 54332, Studio 54333) |
| `supabase db diff --local -f <nombre>` | Genera migración comparando `supabase/schemas/` contra migraciones existentes |
| `supabase migration up` | Aplica migraciones pendientes al Docker local |
| `supabase db reset` | Recrea el Docker local desde cero: migraciones + `seed.sql` (borra datos) |
| `supabase migration list --local` | Lista migraciones aplicadas localmente |
| `supabase db advisors` | Escanea el esquema en busca de issues de seguridad/performance |

**`supabase db push` y `supabase db pull` (sin `--local`) actúan sobre un proyecto remoto enlazado — no se usan en este proyecto.**

### Seguridad: Checklist antes de cada cambio de schema

Antes de comitear una migración nueva (usar la skill `supabase` — ver tabla de Skills — para el detalle completo):

- ✅ **RLS activado** en toda tabla nueva de `public`: `alter table ... enable row level security`
- ✅ **Policies con `TO authenticated`/`TO anon` + predicado** (`auth.uid() = user_id`), nunca solo `TO authenticated` sin filtro de fila (eso es autenticación sin autorización)
- ✅ **UPDATE con `USING` y `WITH CHECK`** — sin `WITH CHECK` un usuario puede reasignar el `user_id` de su propia fila
- ✅ Nunca `auth.role() = 'authenticated'` (deprecado y roto con anonymous sign-ins) — usar la cláusula `TO`
- ✅ **Sin `SECURITY DEFINER`** salvo necesidad real; si se usa, en schema no expuesta y con `auth.uid()` verificado en el cuerpo
- ✅ **Vistas con `security_invoker = true`** en Postgres 15+ (este proyecto usa Postgres 17, ver `major_version` en `config.toml`)
- ✅ `supabase db advisors` sin warnings sin resolver

### No tocar (esto lo controla Supabase CLI)

- ❌ No editar archivos en `supabase/migrations/` a mano — los genera `db diff`
- ❌ No comitear `supabase/.temp/` ni `supabase/.branches/` (ya en `supabase/.gitignore`)
- ❌ No correr `supabase link` ni cambiar `schema_paths`/puertos en `config.toml` sin confirmación explícita
