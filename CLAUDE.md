# LuxePass — Aplicación Next.js + Specs & Diseño

## Qué es este repositorio

Repositorio integral del proyecto **LuxePass** (plataforma de membresía de lujo para el cliente En Soleil, desarrollada por la agencia Kreante). Contiene:

1. **Código de la aplicación** — Next.js 15 + TypeScript + Tailwind 4
2. **Especificaciones** — Historias de usuario y flujos en `docs/specs`
3. **Diseño** — Mockups y sistema de diseño en `docs/design`

---

## Alcance

Los Epics 1–10 están implementados y conectados a **Supabase** (Auth, base de datos, Storage, Realtime, Edge Functions, `pg_cron`), con **Stripe** (modo test), **Google Maps** y **Brevo**. Trabajo a partir de aquí es bugfix, refactor o una historia adicional; lo pendiente vive en `docs/PENDIENTES.md`.

- Qué historia usa qué tabla/RPC/Edge Function: `docs/design/COMPONENT-MAP.md` §Backend real — Epic N.
- Detalle técnico de cada integración (emails, pagos, crons, roles, membresía…): `docs/ARCHITECTURE.md`.
- Infraestructura (2 Supabase remotos `luxepass-dev`/`luxepass-prod`, 2 Vercel) y lo que falta: `docs/ci-cd/RESUMEN.md`.

La app en producción de En Soleil vive en `app.luxepass.co`; si este repo la reemplaza o sigue siendo un proyecto aparte no está resuelto en este documento — no asumir ninguna de las dos sin confirmar.

**No hacer, salvo que se pida explícitamente:**

- ❌ Instalar ORM o cliente de base de datos (Prisma, Drizzle) **excepto** Supabase
- ❌ Enlazar (`supabase link`) un proyecto remoto de Supabase a mano — ver §Supabase
- ❌ Crear route handlers en `src/app/api/` — la lógica de servidor va en Supabase Edge Functions (RPC, webhooks, crons)
- ❌ Añadir autenticación fuera de Supabase Auth (NextAuth, JWT propio, sesiones caseras)
- ❌ Persistir sesión o estado en `localStorage`/`sessionStorage`/cookies propias — la sesión la maneja Supabase Auth
- ❌ Tests e2e con navegador masivos — Playwright es solo verificación visual puntual (`scripts/playwright/README.md`)
- ❌ Implementar un mapa con SVG propio o un proveedor de tiles distinto a Google Maps (`@vis.gl/react-google-maps`, con `@googlemaps/markerclusterer` si agrupa markers)

**Sí hacer:**

- ✅ Validación de cliente para que la pantalla muestre sus estados — nunca sustituye RLS/validación del lado del servidor
- ✅ Navegación con `next/link` y `useRouter`
- ✅ Tests con Vitest + Testing Library, escritos **antes** del código — ver "Metodología de test"

### Reglas vivas de las integraciones

- **Stripe:** el webhook (`stripe-webhook`) es la única fuente de verdad del `status` de `payments`; el cliente nunca marca un pago como exitoso. El importe lo decide el servidor (RPC), nunca el navegador. Checkout Sessions con `ui_mode: 'elements'` + Payment Element, sin `payment_method_types`. Claves live en `main` solo con confirmación explícita.
- **Stripe en local:** sin `stripe listen --forward-to http://127.0.0.1:54331/functions/v1/stripe-webhook` corriendo, los pagos locales se quedan en `pending` (y todo lo que depende de `succeeded` — membresía, importes de partner/admin — no aparece).
- **`memberships`** no admite escrituras de cliente: nace o cambia solo con un pago `succeeded`.
- **Importes mostrados** (partner Guests/Analytics, admin Bookings) son lo cobrado de verdad (pagos `succeeded`), no tarifas fijas.
- **Emails (Brevo):** el asunto lleva prefijo `[LOCAL]`/`[STAGING]`/`[PROD]` según `APP_ENV`; nunca se pone a mano. En un proyecto remoto nuevo, subir el rate limit de emails de Auth (2/hora por defecto) aunque el envío vaya por el Hook.
- **Database Webhooks / `pg_cron`** se autentican con secreto compartido en Supabase Vault — alta y lista en `docs/ci-cd/VAULT-SECRETS.md`. `supabase db reset` los borra.
- **"Hoy"** es la fecha real: `today()` de `src/lib/availability.ts`, en el huso del lounge cuando se le pasa (`lounges.timezone`). Las RPC reciben `p_date` desde el cliente en vez de usar `current_date`.

---

## Rutas existentes

La tabla completa ruta → artboard → story vive en `docs/design/COMPONENT-MAP.md`
(capa 3). Es la fuente única: no duplicarla aquí.

Varias pantallas reúnen varios artboards como estados de la misma vista,
alcanzados por query param (`?map=error`, `?state=today`…). Qué estado usa qué
param: `docs/PENDIENTES.md` §2.2 y la tabla de desviaciones de `COMPONENT-MAP.md`.

**Cada artboard tiene su propia frase de marca** en el panel izquierdo del patrón 1 (`Join a community of discerning travelers.`, `Your next moment of calm is waiting.`…). No reutilizar la de otra pantalla: extraerla del `.dc.html` correspondiente.

---

## Cómo implementar una historia nueva

### Ramas

| Rama | Para qué |
|---|---|
| `main` | Producción. Un push aquí migra `supabase/migrations` a `luxepass-prod` (`.github/workflows/deploy.yml`) |
| `staging` | Pre-producción. Un push aquí migra `luxepass-dev`. Se promueve a `main` con un PR `staging` → `main` |
| `dev` | Desarrollo. Toda rama de trabajo sale de aquí y vuelve aquí por PR. El CI corre en el PR hacia `dev` (no en PR solo de docs/`*.md`) y no despliega nada |

Flujo: `<prefijo>/*` → `dev` → `staging` → `main`, siempre por PR con el CI en verde.
**Nunca trabajar ni hacer `git push` directo sobre `dev`, `staging` ni `main`**
(la protección de ramas en GitHub sigue pendiente: la regla depende de cumplirla).
Promover es un PR aparte que se abre solo cuando se pide; nunca merge local entre
esas tres ramas. Volver atrás un deploy: `docs/ci-cd/ROLLBACK.md`.

**Subir a GitHub requiere confirmación explícita.** Commitear en local está bien;
`git push` (de cualquier rama) y `gh pr create` se hacen solo cuando se pide para
ese paso concreto. Un "hazlo" sobre una lista de pasos que incluía el PR no
cuenta: al terminar, dejar el commit local y preguntar "¿subo la rama y abro el
PR contra `dev`?".

**Base de toda rama de trabajo: `dev` actualizada** — nunca `staging` ni `main`,
aunque sea la rama del checkout al empezar:

```bash
git switch dev && git pull            # 1. dev al día
git switch -c fix/<descripcion>       # 2. rama nueva desde dev
gh pr create --base dev               # 3. PR siempre contra dev (con confirmación)
```

| Prefijo | Cuándo |
|---|---|
| `feat/` | Pantalla o funcionalidad nueva |
| `fix/` | Corrección de un fallo |
| `refactor/` | Reestructurar sin cambiar comportamiento |
| `test/` | Solo añadir o actualizar tests |
| `chore/` | Tooling, dependencias, configuración |
| `docs/` | Solo documentación |

Formato `<prefijo>/<descripción-en-kebab>` (`feat/lounge-search`). **Una rama = un
propósito**; trabajo no relacionado va en otra rama. Commits en Conventional
Commits (`feat:`, `fix:`, `docs:`…).

#### Trabajo en paralelo (worktrees)

```bash
bash scripts/new-worktree.sh <prefijo>/<descripcion> [puerto-dev]   # rama desde origin/dev, copia .env*, npm install
```

- Nunca `git switch` en una carpeta que usa otra sesión: comprobar antes con `git branch --show-current` y `git worktree list`.
- **Lo compartido se usa de uno en uno**: Supabase local (cambios de schema, `db reset`, `migration up`) y la suite completa (`npm test`, porque `cleanTestData` borra los datos de test de otras sesiones). Preguntar antes si otra sesión lo está usando.
- Cada dev server en su propio puerto (`npm run dev -- -p 3001`). Al terminar: `git worktree remove <carpeta>`.

**Cuando dos ramas tocan lo mismo**, merge secuencial: se mergea una y la otra
hace `git fetch origin && git rebase origin/dev`, resuelve conservando ambos
cambios y vuelve a pasar el paso 8 antes de `git push --force-with-lease` (con
confirmación).

- `COMPONENT-MAP.md` / `PENDIENTES.md`: quedarse con las filas de ambas ramas.
- **Migraciones:** `declarative sync` recrea *todas* las funciones en cada migración, no solo las que cambiaste. Si dos ramas abiertas cambian schema (aunque sean funciones distintas), la que se mergea después re-crearía las funciones de la otra con su versión vieja — y si cambiaron de firma, el deploy falla. Tras el rebase, **borrar la migración propia no mergeada y regenerarla** sobre la base actualizada, o juntar los cambios en una sola rama. Una migración que ya llegó a `dev` no se toca nunca.

### Receta

**1. Leer la historia** — `docs/specs/epic-N-slug/story-N.M-slug.md`. Sus `## Acceptance Criteria` son el contrato.

**2. Leer el flujo** que la historia enlaza en `## Related Flow` (`docs/specs/flows/`). Su tabla "Story Segments" dice qué nodos le corresponden.

**2.1. Leer `docs/DATA-MODEL-MAP.md`** — qué epic es dueño de cada tabla y qué cruces ya se anticiparon.

**3. Leer la fase de diseño** en `docs/design/DESIGN-SYSTEM.md` §6. **Los números de fase no coinciden con los de epic** (ver tabla abajo).

**4. Leer los artboards** `.dc.html` de esa carpeta: HTML real con estilos inline, fuente de verdad de medidas y copy.

**5. Leer `docs/design/COMPONENT-MAP.md`** — qué componentes existen y la tabla de "gemelos" claro/oscuro.

**6. Implementar con TDD** (ver "Metodología de test"). Para componentes, en orden: reutilizar tal cual → añadir variante (`cva`) → solo si nada encaja, crear uno nuevo y anotarlo en el mapa.

**7. Actualizar `COMPONENT-MAP.md`**: componentes nuevos, rutas nuevas (capa 3) y desviaciones respecto al artboard.

**8. Verificar antes de dar nada por hecho:**
```bash
npm test             # toda la suite en verde, sin tests omitidos
npx tsc --noEmit     # debe salir vacío
npm run lint         # debe salir sin problemas
npm run build        # debe compilar y listar las rutas nuevas
npm run dev          # y comprobar que las rutas responden 200
```

**9. Revisar `docs/PENDIENTES.md`**: añadir lo que quede abierto y cerrar lo resuelto.

**10. Commit local y parar.** Push y PR solo con confirmación (ver §Ramas).

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
| 10 | `epic-10-partner-organizations` | idem | 10 |

### Qué NO tocar

- **Los `## Acceptance Criteria` de los specs.** Contrato del cliente: no marcar checkboxes ni reescribirlos.
- **Los artboards `.dc.html`.** Si algo no cuadra, se anota como desviación en el mapa.
- **La paleta literal de `globals.css`** (§2 del design system) sin actualizar antes el design system.

### Nunca inventar un diseño

**Cada pantalla tiene su artboard.** Nada "provisional", "scaffold" ni maqueta propia, tampoco para pantallas internas. Si una pantalla nueva no tiene `.dc.html`: **parar**, preguntar si se reutiliza un artboard existente o se diseña uno nuevo, y continuar solo con confirmación explícita.

---

## Al implementar una pantalla

**Antes de crear cualquier componente, leer `docs/design/COMPONENT-MAP.md`.** Después de crear uno, añadir su fila.

```
Capa 0  tokens        src/app/globals.css        §2 Tokens · §3 Tipografía
Capa 1  primitivos    src/components/ui/         §4 Componentes
Capa 2  patrones      src/components/patterns/   §5 Patrones de pantalla
Capa 3  pantallas     src/app/**/page.tsx        solo componen
```

- **Una pantalla no escribe un `px` ni un `#hex`.** Si necesita algo que no existe, se sube a capa 1 o 2 y se anota en el mapa.
- Los componentes consumen **tokens semánticos** (`bg-surface`, `text-fg-muted`, `border-line`), no literales (`bg-gold-500`), salvo donde el design system cita el valor exacto.
- **Un solo componente para los dos temas.** El shell pone `data-theme="dark"`; las diferencias de geometría entre gemelos (input 44 vs 50px) van como variante explícita.
- Artboards desktop 1440×900; la app es responsive y las desviaciones se documentan en el mapa.
- La lógica de un epic va en `src/components/<epic>/` (`onboarding/`, `partner/`, `admin/`…), no en `ui/` ni en `patterns/`. Los accesos a datos de cada historia viven en `src/lib/`.

---

## Metodología de test — TDD

Toda historia y todo bugfix siguen la skill `test-driven-development` (se invoca antes de tocar código). Lo específico de este proyecto:

- **El test sale de los `## Acceptance Criteria` y de los nodos del flow — nunca del `.dc.html`.** Copy, medidas, colores y clases no se testean. Documentación, configuración sin efecto y ajustes puramente visuales tampoco llevan test.
- **Bugs**: se reproduce con un test que falla antes de arreglar.
- Consultar por rol y etiqueta (`getByRole`, `getByLabelText`), nunca por clase ni estructura del DOM.
- `userEvent.setup({ delay: null })` siempre (sin esto la suite pasa de ~4 s a ~20 s).
- **`next/navigation` es el único mock permitido.** Todo lo demás corre contra la implementación real. Rellenar una API que jsdom no trae (`vitest.setup.ts`: `IntersectionObserver` inerte, `WebSocket` inerte porque el de `undici` revienta con `@supabase/realtime-js`) no cuenta como mock.
- **Ningún registro de test sobrevive a la corrida.** La suite corre contra el Supabase local real; `vitest.global-setup.ts` llama a `cleanTestData` (`src/lib/testing/clean-test-data.ts`) antes y después. Un test nuevo crea datos que esa limpieza reconozca: emails de dominios de test (`…-test.example`, `example.com`), ids `test-…`, nombres con sello `Date.now()`. Si crea un tipo de registro nuevo, se amplía `cleanTestData` en el mismo cambio. Los datos del seed y la cuenta admin real nunca se tocan. `KEEP_TEST_DATA=1 npm test` conserva los datos para depurar.
- **Páginas Server Component** (PERF-02): la página solo comprueba la sesión (`requireSession()`), llama a una función de `src/lib` y pinta una vista cliente. No llevan test propio (mockear `next/headers` está fuera de la regla): el test llama a la misma función de `src/lib` y renderiza la vista (ver `src/app/lounges/[id]/page.test.tsx`). Una ruta que pasa a servidor se añade a la regla `NetworkOnly` de `next.config.ts`.
- Punto de partida para una pantalla nueva: `src/app/login/page.test.tsx` y `src/app/signup/page.test.tsx` (patrón para un modal de Radix). Los `describe` agrupan por comportamiento.
- **La suite completa tiene fallos intermitentes bajo carga** (timeouts, Stripe sandbox, `seats_left` compartidos): antes de dar un fallo por regresión, correr esos archivos aislados.

---

## Skills

| Skill | Cuándo se usa |
|---|---|
| `test-driven-development` | **Antes de cualquier historia o bugfix** |
| `frontend-design` | Componer pantallas y componentes de UI |
| `design` | Crear o re-sembrar un canvas de mockups `.dc.html` |
| `systematic-debugging` | Algo falla y la causa no es evidente |
| `verification-before-completion` | Antes de dar una historia por terminada |
| `supabase` | **Antes de cualquier cambio de schema o comando de Supabase** |
| `ci-cd-and-automation` | Al tocar `.github/workflows/*.yml` |

---

## Diseño (`docs/design/`)

**Antes de implementar, leer `docs/design/DESIGN-SYSTEM.md`**: tokens (Bodoni Moda + Manrope), componentes con medidas (§4), patrones de pantalla (§5) y qué artboards tiene cada fase (§6). Los tokens viven en `src/app/globals.css` como CSS custom properties expuestas a Tailwind con `@theme inline`.

- Copy de la UI en **inglés**; documentación en español.
- Tema **híbrido**: claro/boutique para miembro, oscuro/moderno para Partner Dashboard y Admin.
- `logo.png` de cada carpeta y de `public/` es una copia reducida (54 KB); el original (907 KB) vive en `assets/brand/` y no se copia de ahí.
- Se versionan `.dc.html` (fuente), `.html` publicable, `canvas.json` y `logo.png`.

---

## Stack tecnológico

- **Next.js 15.1** — App Router, PWA (`@ducanh2912/next-pwa`; `public/sw.js` y `workbox-*.js` se regeneran en cada build, no editarlos)
- **TypeScript**
- **Tailwind CSS 4** — **No hay `tailwind.config.ts`**: el tema vive en `@theme inline` dentro de `src/app/globals.css`
- **Radix UI** — primitivas accesibles
- **lucide-react** — iconos, con `strokeWidth={1.6}`
- **class-variance-authority** — variantes de componente (no condicionales de string sueltos)
- **Recharts** — gráficos (`components/charts/`)
- **@vis.gl/react-google-maps + @googlemaps/markerclusterer** — proveedor único de mapa
- **Supabase** — Auth, Postgres, Storage, Realtime, Edge Functions, `pg_cron`/`pg_net`
- **Stripe** (`@stripe/stripe-js` + `@stripe/react-stripe-js`) — modo test; datos de tarjeta solo en Stripe Elements (PCI SAQ A)
- **Brevo** — email transaccional desde Edge Functions (`supabase/functions/_shared/brevo.ts`)
- **Vitest + Testing Library** (jsdom) · **Playwright** solo para verificación visual puntual

**Convenciones de código:** sin comentarios innecesarios — sí comentar de qué artboard sale una pantalla y qué fila del design system implementa un componente. Transiciones CSS: 150ms ease.

**Comandos:**
```bash
npm run dev        # http://localhost:3000   → escribe en .next
npm run build      # build producción + SW   → escribe en .next-build
npm run start      # sirve .next-build
npm test           # Vitest, una pasada
npm run test:watch # ciclo rojo-verde
npm run lint
npx tsc --noEmit
```

Build y dev pueden correr a la vez porque escriben en directorios distintos (`distDir` en `next.config.ts`). En Vercel (`VERCEL=1`) vuelve a `.next`, que es lo que su builder espera.

**Si una pantalla se ve entera pero no responde a nada**, el dev server no está sirviendo React (`.next` sin `main-app.js`, ver `docs/PENDIENTES.md` §4.2):

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/_next/static/chunks/main-app.js   # 200 = sano
```

Si da 404: parar el dev server, `rm -rf .next`, arrancarlo y recargar duro (Ctrl+Shift+R).

---

## Supabase

**REGLA CRÍTICA:** todo lo que toque la base de datos usa **el proyecto local** (Docker, Supabase CLI). Nunca `supabase link` a un remoto, ni `supabase db push`/`db pull` sin `--local`. Si hace falta enlazar un remoto, **parar y pedir confirmación explícita**. Única excepción: el runner de CI (`.github/workflows/deploy.yml`), que enlaza y migra `luxepass-dev`/`luxepass-prod` con GitHub Secrets — detalle en `docs/ci-cd/RESUMEN.md`.

Antes de cualquier comando, comprobar que es local: `supabase status` debe dar API `http://127.0.0.1:54331` y `NEXT_PUBLIC_SUPABASE_URL` de `.env.local` el mismo host. Si algo apunta a `*.supabase.co`, **parar**. `.env.local` nunca se comitea.

**Schema: Declarative Schemas obligatorio.** El estado final de cada entidad vive en `supabase/schemas/*.sql` (`schema_paths` en `config.toml` — no cambiarlo, ni puertos, sin confirmación). Nunca migraciones a mano ni SQL suelto para cambios de schema; cambios hechos en Studio son invisibles para el diff.

```bash
# 1. editar supabase/schemas/*.sql
supabase db schema declarative sync --no-apply -f <nombre>   # 2. genera la migración (NO usar `db diff`: desde CLI v2.116 ya no lee schemas/)
# 3. revisar el archivo: sin DROP/ALTER destructivos inesperados, RLS y policies en tablas nuevas
supabase migration up                                         # 4. aplica al Docker local
supabase db advisors                                          # 5. sin warnings sin resolver
```

Comitear el schema **y** la migración generada. No editar nunca `supabase/migrations/` a mano. `supabase db reset` recrea todo desde cero (borra datos y los secretos de Vault).

Checklist de seguridad (detalle en la skill `supabase`): RLS en toda tabla de `public`; policies con `TO authenticated`/`TO anon` **y** predicado de fila; UPDATE con `USING` y `WITH CHECK`; nunca `auth.role()`; `SECURITY DEFINER` solo si hace falta, con `search_path = ''` y autorización explícita en el cuerpo; vistas con `security_invoker = true`.
