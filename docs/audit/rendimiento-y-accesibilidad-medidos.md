# Auditoría medida — rendimiento y accesibilidad

Amplía `frontend-rendimiento-y-accesibilidad.md` (PERF-01..04, A11Y-01, análisis estático) y `e2e-flujos-criticos.md` (E2E-13) con **mediciones en navegador**. No repite esos hallazgos: los confirma o matiza y añade PERF-1x / A11Y-1x.

## Método

- Build de producción (`npm run build` → `.next-build`) servido con `next start -p 3006`; Supabase **local** (127.0.0.1:54331). Rama `docs/project-audit`, sin cambios en código de la app.
- Lighthouse no está instalado (no se añadió). Se midió con Playwright + Chromium: emulación Pixel 7 a 390×844, **CPU 4×**, red ~slow 4G (150 ms RTT, 1,6 Mbps). LCP/CLS con `PerformanceObserver`; **TBT aproximado** = Σ(longtask − 50 ms) hasta 7 s después de `load`; tamaños por `request.sizes()`.
- Accesibilidad: `axe-core` 4.13 inyectado desde `node_modules` (dependencia transitiva de `eslint-plugin-jsx-a11y`, no se añadió nada), reglas WCAG 2.0/2.1/2.2 A-AA + best-practice. Más comprobaciones manuales: teclado, foco, diálogos Radix, errores de formulario, reduced-motion, objetivos táctiles a 390 px, reflow a 640 px CSS (equivalente a zoom 200 % en 1280 px).
- Cuentas temporales `perfa11y-*@example.com` (miembro, partner de The Ainsworth Collection, admin), borradas al terminar.
- Scripts y evidencias: `scripts/playwright/audit-perf-a11y/` (`measure.mjs`, `a11y-interact.mjs`, `summarize.cjs`, `screenshots/metrics.json`, `screenshots/a11y-interact.json`, capturas `*.png`).
- Limitación: servidor y Supabase en localhost; las cifras absolutas son optimistas en backend, comparables entre rutas. `/` y `/explore` anónimos redirigen a `/login`. No existe `/admin` como página; se midió `/admin/members`, `/admin/analytics` y `/admin/lounges/the-ainsworth`.

## Tabla de métricas por ruta (móvil, 4× CPU)

| Ruta (rol) | First Load JS build | JS transferido | Total transf. | FCP ms | LCP ms | CLS | TBT≈ ms | Peticiones Supabase | `auth/v1/user` | Violaciones axe | Desborde 390 px | Desborde 640 px (zoom 200 %) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` → `/login` (anón) | 202 kB | 210 KB | 266 KB | 2356 | 2480 | 0 | 187 | 0 | 0 | contrast 4, landmark-one-main, region 11, target-size 1 | 0 | 0 |
| `/login` (anón) | 198 kB | 212 KB | 322 KB | 1156 | 1168 | 0 | 61 | 0 | 0 | ídem | 0 | 0 |
| `/signup` (anón) | 215 kB | 215 KB | 321 KB | 2008 | 2116 | 0 | 100 | 0 | 0 | contrast 6, landmark-one-main, region 14, target-size 1 | 0 | 0 |
| `/explore` (miembro) | **251 kB** | 255 KB | 361 KB | 2456 | 2848 | **0,797** | **459** | 8 | **3** | contrast 38 | 0 | 0 |
| `/lounges/the-ainsworth` | 230 kB | 232 KB | 313 KB | 2208 | 3024 | 0 | 103 | 13 | 2 | contrast 8 | **208** | 0 |
| `/lounges/the-ainsworth/book` | 211 kB | **606 KB** | **725 KB** | 2116 | 2880 | 0 | 349 | 12 | 2 | contrast 23, dlitem 4, page-has-heading-one | **286** | **36** |
| `/my-pass` | 239 kB | 241 KB | 343 KB | 2440 | 2440 | 0 | 166 | 9 | 1 | contrast 5 | **209** | 0 |
| `/profile` | 233 kB | 251 KB | 300 KB | 2500 | 2500 | 0 | 414 | 10 | 2 | contrast 9 | **558** | **308** |
| `/partner` (oscuro) | 237 kB | 238 KB | 271 KB | 2880 | 2880 | 0,039 | 132 | 5 | 0 | region 3 | 0 (contenido recortado) | 0 |
| `/partner/analytics` | 227 kB | 228 KB | 263 KB | 2992 | 2992 | **0,214** | 182 | 6 | 0 | heading-order, region 3 | 0 | 0 |
| `/admin/members` | 200 kB | 201 KB | 278 KB | 2368 | 2368 | **0,339** | 76 | 7 | 1 | region 3 | 0 | 0 |
| `/admin/analytics` | 203 kB | 204 KB | 244 KB | 2480 | 2480 | **0,150** | 169 | 7 | 1 | region 3 | 0 | 0 |
| `/admin/lounges/the-ainsworth` | **274 kB** | 279 KB | 325 KB | 3140 | 3140 | 0,111 | 291 | 6 | 1 | target-size 6, image-redundant-alt 5, region 4 | 0 | 0 |

Rutas con First Load JS > 250 kB en el build: `/admin/lounges/[id]` 274, `/admin/lounges/new` 270, `/explore` 251, `/admin/partners/[id]` 250 (límite). Compartido por todas: 105 kB.

Chunks de terceros (build, sin gzip / gzip): Google Maps loader `883ee446` 44 KB / 14 KB (+ ~6–7 KB de scripts de `maps.googleapis.com` en runtime); Stripe `7869` 16 KB / 6 KB + **~289 KB de `js.stripe.com`** en runtime en `/book`; supabase-js `6140` 195 KB / 55 KB + `44530001` 64 KB / 14 KB en el bundle común. **Recharts no aparece en ningún chunk**: `src/components/charts/{bar,line}-chart.tsx` lo importan pero ninguna página usa esos componentes, así que la parte de Recharts de PERF-01 no tiene coste hoy.

Imágenes: el único peso relevante es `logo.png` vía `next/image` (7–26 KB). Las fotos de lounges del seed local no se sirvieron en las rutas medidas, por lo que PERF-04 (`<img>` sin `next/image`) no se pudo cuantificar en bytes.

## Confirmación de hallazgos previos

| ID previo | Resultado medido |
|---|---|
| PERF-01 | Confirmado para Stripe (PERF-11) y Google Maps (`/explore`, `/admin/lounges/[id]` > 250 kB). Recharts: sin coste (no se usa). |
| PERF-02 | Coherente: FCP ≈ LCP en casi todas las rutas (todo pinta tras hidratar). Sin medición aislada. |
| PERF-03 | **Confirmado**: `GET /auth/v1/user` ×3 en `/explore`, ×2 en lounge, book y profile → PERF-12. |
| PERF-04 / A11Y-01 | Sin evidencia nueva (no se sirvieron fotos de lounge). En admin aparece el problema inverso: `image-redundant-alt` (A11Y-17). |
| E2E-13 | **Confirmado** en build de producción: lounge 208 px, book 286, my-pass 209, profile 558 de exceso a 390 px; además falla el reflow a 640 px (A11Y-14). |

## Resumen de hallazgos nuevos

| ID | Severidad | Título |
|---|---|---|
| PERF-10 | High | CLS 0,797 en `/explore` (miembro) y 0,11–0,34 en dashboards partner/admin |
| PERF-11 | High | Stripe.js (~289 KB) se carga en todo `/book` desde el paso 1 y también en `/profile` |
| PERF-12 | Medium | Peticiones Supabase duplicadas por carga (`auth/v1/user` ×3, `partner_context` ×2, `memberships`/`profiles`/`bookings` ×2) |
| PERF-13 | Medium | TBT ≈ 350–460 ms en `/explore`, `/book` y `/profile` con CPU 4× |
| PERF-14 | Low | Rutas > 250 kB First Load JS: `/admin/lounges/[id]`, `/admin/lounges/new`, `/explore` |
| PERF-15 | Low | Recharts declarado en `components/charts/` pero sin uso (código muerto) |
| A11Y-10 | High | Contraste insuficiente de los tokens dorado y gris del tema claro (#ad8a5c 3,19:1; #9c8d80 2,95–3,21:1) |
| A11Y-11 | High | Errores de login no anunciados ni asociados al campo (sin `role="alert"`/`aria-live`, sin `aria-describedby`) |
| A11Y-12 | Medium | Sin landmark `main` en las pantallas de auth (patrón 1) |
| A11Y-13 | Medium | Foco no vuelve al disparador al cerrar el modal Terms (Radix) con Escape |
| A11Y-14 | Medium | Reflow a 200 % roto en `/profile` (308 px) y `/book` (36 px) — WCAG 1.4.10 |
| A11Y-15 | Medium | Objetivos táctiles < 24 px (mostrar contraseña 18×18, check-in partner 20×20, miniaturas admin 2×144) |
| A11Y-16 | Medium | Partner Dashboard a 390 px: cabecera recortada y texto solapado, sin navegación accesible |
| A11Y-17 | Low | Jerarquía de encabezados: sin `h1` en `/explore` y `/book`; `heading-order` en `/partner/analytics`; `dt` sin `dl` en `/book` |
| A11Y-18 | Low | Sin soporte de `prefers-reduced-motion` |
| A11Y-19 | Low | `image-redundant-alt` en la galería de `/admin/lounges/[id]` |

Verificado sin hallazgo: foco visible en 25 tabulaciones en `/explore`, `/lounges/…`, `/partner` y `/admin/members` (claro y oscuro: todos los elementos con anillo); trampa de foco correcta en el modal Terms y en el popover de notificaciones (Escape devuelve el foco al botón de campana); `lang="en"`; tema oscuro sin violaciones de contraste en las rutas medidas.

## Hallazgos

### PERF-10 — High — Layout shift
- **Ruta:** `/explore` (miembro) CLS 0,797; `/admin/members` 0,339; `/partner/analytics` 0,214; `/admin/analytics` 0,150; `/admin/lounges/[id]` 0,111. Umbral "bueno" ≤ 0,1.
- **Evidencia:** `metrics.json`, `layout-shift` sin input reciente; capturas `member-explore.png`, `admin-admin-members.png`.
- **Impacto:** la lista/mapa salta cuando llegan los datos (todo client-side, PERF-02); toques erróneos en móvil; Core Web Vital en rojo.
- **Remediación:** reservar espacio (alto fijo/`aspect-ratio`) para el mapa y las tarjetas de `/explore`; skeletons del mismo tamaño que filas y KPIs en dashboards; no insertar banners encima del contenido tras cargar.
- **Cierre:** CLS ≤ 0,1 en las cinco rutas con `measure.mjs`.

### PERF-11 — High — Stripe cargado fuera del pago
- **Ruta:** `/lounges/[id]/book` (paso 1, calendario) y `/profile`.
- **Evidencia:** 289 KB de `js.stripe.com`/`m.stripe.network` en `/book` (JS total 606 KB frente a 211 kB del build); 21 KB en `/profile`. Causa: `StripeCheckoutBridge` envuelve todo el layout `src/app/lounges/[id]/book/layout.tsx` y llama `getStripe()` al montar.
- **Impacto:** triplica el JS del flujo de reserva en móvil; carga `load` de 4,9 s frente a ~1,9 s en las demás rutas.
- **Remediación:** montar el bridge/`loadStripe` solo en `/book/payment` y `/book/summary` (o con `next/dynamic` al llegar al paso de pago); en `/profile`, cargar Stripe solo al abrir el modal de upgrade.
- **Cierre:** `/book` paso 1 sin peticiones a `*.stripe.com`; JS transferido < 260 KB.

### PERF-12 — Medium — Peticiones Supabase duplicadas (amplía PERF-03)
- **Ruta:** `/explore` (`auth/v1/user` ×3), `/lounges/[id]` (`user` ×2, `lounge_seasons` ×2, `lounge_closures` ×2), `/book` (`profiles` ×2, `memberships` ×2), `/my-pass` (`bookings` ×2, `memberships` ×2), `/profile` (`memberships` ×2, `profiles` ×2), `/partner*` (`partner_context` ×2).
- **Evidencia:** `sbCounts` en `metrics.json`.
- **Impacto:** 8–13 viajes por pantalla; con 150 ms de RTT, cada duplicado secuencial añade latencia visible.
- **Remediación:** un proveedor de sesión/perfil/membresía por layout que comparta el resultado; `getClaims()`/sesión local en vez de `getUser()` repetido; deduplicar `partner_context` en el layout partner.
- **Cierre:** cada endpoint 1× por carga; `auth/v1/user` ≤ 1.

### PERF-13 — Medium — Hilo principal bloqueado
- **Ruta:** `/explore` 459 ms, `/profile` 414 ms, `/book` 349 ms de TBT aproximado (4× CPU).
- **Evidencia:** suma de longtasks en `metrics.json`.
- **Impacto:** interacción lenta en móviles de gama media (INP).
- **Remediación:** los mismos de PERF-01/02/11: carga diferida de Maps/Stripe y Server Components para el contenido estático.
- **Cierre:** TBT ≈ < 200 ms en las tres rutas.

### PERF-14 — Low — Presupuesto de JS
- **Ruta:** `/admin/lounges/[id]` 274 kB, `/admin/lounges/new` 270 kB, `/explore` 251 kB, `/admin/partners/[id]` 250 kB (build).
- **Impacto:** moderado (admin es de escritorio); `/explore` es pantalla de miembro.
- **Remediación:** `next/dynamic` del mapa/editor de ubicación en admin lounges; ver PERF-01.
- **Cierre:** todas las rutas ≤ 250 kB en `npm run build`.

### PERF-15 — Low — Recharts sin uso
- **Ruta:** `src/components/charts/bar-chart.tsx`, `line-chart.tsx`.
- **Evidencia:** ningún import desde `src/app`; ningún chunk del build contiene Recharts.
- **Impacto:** nulo en bundle; deuda y dependencia sin uso (CLAUDE.md la declara para Epic 7/8).
- **Remediación:** decidir si los gráficos de analytics deben usarlos o retirar la dependencia; si se usan, cargarlos con `next/dynamic`.
- **Cierre:** decisión anotada en `PENDIENTES.md`.

### A11Y-10 — High — Contraste de tokens claros
- **Ruta:** todas las del miembro y auth (38 nodos en `/explore`, 23 en `/book`).
- **Evidencia:** axe `color-contrast`: `#ad8a5c` sobre `#ffffff` 3,19:1 (13 px bold, "Forgot password?", etiquetas), sobre `#fcf4ee` 2,94:1; `#9c8d80` sobre blanco 3,21:1 y sobre `#fcf4ee` 2,95:1. Requerido 4,5:1.
- **Impacto:** texto secundario y enlaces ilegibles para baja visión; WCAG 1.4.3 AA.
- **Remediación:** oscurecer los tokens semánticos de texto (`text-accent`/`text-fg-subtle`) en tema claro a ≥ 4,5:1, actualizando antes `DESIGN-SYSTEM.md` §2 (regla de CLAUDE.md); el dorado puede quedar para fondos y bordes.
- **Cierre:** 0 `color-contrast` en `measure.mjs`.

### A11Y-11 — High — Errores de formulario no anunciados
- **Ruta:** `/login` (y por el mismo patrón `Field`, probablemente partner/admin login).
- **Evidencia:** `a11y-interact.json`: tras credenciales erróneas aparece "We could not find an account… 4 attempts left" (`a11y-login-error.png`), pero hay 0 `role=alert`/`aria-live`; inputs con `aria-invalid="true"` y `aria-describedby=null`. En `/signup` el botón queda deshabilitado sin explicación asociada al campo.
- **Impacto:** un lector de pantalla no sabe por qué falló el login ni cuántos intentos quedan antes del bloqueo.
- **Remediación:** en `Field`, enlazar el mensaje de error con `aria-describedby` y un id; contenedor de error de envío con `role="alert"`; texto de ayuda de `/signup` asociado al botón/checkbox.
- **Cierre:** test de Testing Library que encuentre el error por `getByRole("alert")` y `toHaveAccessibleDescription` en el input.

### A11Y-12 — Medium — Sin `main` en auth
- **Ruta:** `/login`, `/signup` (patrón 1).
- **Evidencia:** axe `landmark-one-main` + `region` (11–14 nodos).
- **Impacto:** navegación por landmarks imposible.
- **Remediación:** `<main>` en el patrón de capa 2 del split de auth; panel de marca como `aside`.
- **Cierre:** 0 `landmark-one-main`/`region` en esas rutas.

### A11Y-13 — Medium — Retorno de foco en el modal Terms
- **Ruta:** `/signup`.
- **Evidencia:** Tab ×12 dentro del diálogo (trampa correcta), pero tras Escape `document.activeElement` = `BODY`.
- **Impacto:** el usuario de teclado vuelve al principio de la página.
- **Remediación:** usar `Dialog.Trigger` (o `onCloseAutoFocus` que enfoque el enlace/checkbox de términos).
- **Cierre:** tras Escape, foco en el disparador.

### A11Y-14 — Medium — Reflow 200 % (complementa E2E-13)
- **Ruta:** `/profile` 308 px y `/book` 36 px de desborde horizontal a 640 px CSS.
- **Evidencia:** `member-profile-zoom200.png`, `member-lounges-the-ainsworth-book-zoom200.png`.
- **Impacto:** WCAG 1.4.10; con zoom hay que hacer scroll en dos ejes.
- **Remediación:** la misma que E2E-13 (grids a una columna, sin anchos fijos).
- **Cierre:** desborde 0 a 390 y 640 px en las rutas de la tabla.

### A11Y-15 — Medium — Objetivos táctiles pequeños
- **Ruta:** auth (botón mostrar contraseña 18×18), `/partner` ("Mark … as arrived" 20×20, "View" 34×17), `/admin/lounges/[id]` (miniaturas 2×144 a 390 px), `/explore` ("Change location" 47×19).
- **Evidencia:** axe `target-size` (WCAG 2.5.8) y recuento DOM (`small24` en `metrics.json`); entre 3 y 23 objetivos < 44 px por pantalla.
- **Impacto:** toques fallidos; el check-in partner es acción operativa en tablet/móvil.
- **Remediación:** área de toque mínima 24 px (ideal 44) con padding/pseudo-elemento en los primitivos `Input` (icono), checkbox de check-in y galería admin.
- **Cierre:** 0 `target-size` en axe.

### A11Y-16 — Medium — Partner Dashboard a 390 px
- **Ruta:** `/partner`.
- **Evidencia:** `partner-partner.png`: cabecera recortada ("The A…"), la línea de fecha/"view this month's digest" se solapa con el buscador, no hay navegación visible ni disparador de menú (`aria-haspopup`/`aria-expanded`: 0). El desborde medido es 0 porque el contenido se recorta (`overflow` oculto), no porque quepa.
- **Impacto:** inutilizable en móvil sin pérdida de información (WCAG 1.4.10); pantallas sin acceso a otras secciones.
- **Remediación:** decidir si el dashboard partner debe ser responsive (anotar desviación en `COMPONENT-MAP.md`); si sí, cabecera que haga wrap y nav colapsable accesible.
- **Cierre:** captura a 390 px sin solapes y con navegación alcanzable por teclado.

### A11Y-17 — Low — Encabezados y semántica
- **Ruta:** `/explore` sin `h1`; `/book` sin `h1` (`page-has-heading-one`) y 4 `dt` fuera de `dl` (`dlitem`); `/partner/analytics` salta a `h3` (`heading-order`).
- **Remediación:** `h1` (puede ser `sr-only`) por pantalla; `dl` en el resumen de reserva; niveles consecutivos.
- **Cierre:** 0 de esas reglas en axe.

### A11Y-18 — Low — `prefers-reduced-motion`
- **Ruta:** global (`src/app/globals.css`; 0 coincidencias de `prefers-reduced-motion` en `src`).
- **Evidencia:** con `reducedMotion: "reduce"`, 38 elementos de `/explore` mantienen transición.
- **Impacto:** bajo (transiciones de 150 ms), mayor en animaciones de spinner/drawer.
- **Remediación:** bloque `@media (prefers-reduced-motion: reduce)` que anule transiciones/animaciones no esenciales.
- **Cierre:** 0 elementos con `transition-duration > 0` bajo `reduce`.

### A11Y-19 — Low — Alt redundante en admin
- **Ruta:** `/admin/lounges/[id]`.
- **Evidencia:** axe `image-redundant-alt` (5): botón "View photo Day rooms" con `img alt="Day rooms"`.
- **Remediación:** `alt=""` en la imagen dentro de un botón ya etiquetado (inverso de A11Y-01, que es sobre fotos sin botón).
- **Cierre:** 0 `image-redundant-alt`.

## Cómo repetir

```bash
npm run build && npx next start -p 3006        # en otra terminal
node scripts/playwright/audit-perf-a11y/measure.mjs all      # métricas + axe → screenshots/metrics.json
node scripts/playwright/audit-perf-a11y/a11y-interact.mjs    # teclado, errores, diálogos (necesita .storage.json de measure)
node scripts/playwright/audit-perf-a11y/summarize.cjs        # resumen legible
```

`measure.mjs` crea cuentas `perfa11y-*@example.com` (las limpia `cleanTestData`) y aborta si `.env.local` no apunta a Supabase local. `.storage.json` contiene sesiones: no comitearlo.
