# Auditoría frontend — rendimiento y accesibilidad

Fecha: 2026-10-12 · Rama: `docs/project-audit` · Alcance: `src/app`, `src/components`, `src/lib`. Auditoría de solo lectura, con muestreo por grep y lectura dirigida (no exhaustiva). `npm run build` no se ejecutó (existe `.next-build` y no se pudo descartar otra sesión): **First Load JS por ruta queda pendiente de medir**.

## Resumen

| ID | Sev. | Tema |
|---|---|---|
| PERF-01 | High | 0 `next/dynamic`: Google Maps, Recharts y Stripe en el bundle inicial |
| PERF-02 | High | Las 52 páginas son `"use client"`: sin Server Components |
| PERF-03 | Medium | `auth.getUser()` (petición de red) repetido en cada helper de `src/lib` |
| PERF-04 | Low | `<img>` sin `next/image` (5 casos) |
| CONV-01 | Medium | ~354 valores arbitrarios `[..px]` en páginas (capa 3) |
| A11Y-01 | Low | `alt=""` en fotos de lounge con contenido |
| OK | — | Realtime y listeners con limpieza correcta |

## Hallazgos

### PERF-01 — High — `bundle-dynamic-imports`
- **Evidencia:** `grep "dynamic(" src` → 0 resultados. `src/app/explore/page.tsx:16` importa `CityMap` estáticamente (`@vis.gl/react-google-maps`); `src/components/charts/bar-chart.tsx`, `line-chart.tsx` (Recharts ~100 KB+); `src/components/booking/stripe-checkout-bridge.tsx` y `membership/upgrade-confirm-modal.tsx` (Stripe).
- **Impacto:** las rutas de miembro y admin cargan librerías pesadas antes de necesitarlas; peor TTI en móvil (PWA).
- **Fix:** `next/dynamic(() => import(...), { ssr: false, loading })` para mapa, gráficos y checkout/modal de upgrade.
- **Cierre:** build muestra reducción de First Load JS en `/explore`, `/admin/analytics/*`, `/partner/*`, `/lounges/[id]/book`; los chunks de recharts/maps/stripe no aparecen en el shared bundle.

### PERF-02 — High — `server-client-boundary` / `use-client-overuse`
- **Evidencia:** 52 `page.tsx` con `"use client"` en la primera línea; toda la carga de datos va por `useEffect` + cliente Supabase en navegador.
- **Impacto:** HTML sin datos → spinner + waterfall (JS → auth → query); todo el árbol se hidrata.
- **Fix:** progresivo: páginas de solo lectura (`/lounges/[id]`, admin analytics, listas) como Server Component con `@supabase/ssr` y hojas interactivas como client components. Coherente con la regla de no crear `src/app/api/`.
- **Cierre:** al menos las rutas de lectura principales renderizan datos en el HTML del servidor; `"use client"` solo en componentes hoja.
- **Avance (20 oct 2026) — piloto `/lounges/[id]`:** Server Component con `requireSession()` en `app/lounges/[id]/layout.tsx` (redirección 307 antes del streaming) y `loadLoungeProfile` (perfil + fotos, disponibilidad, favorito y temporadas en paralelo); `LoungeProfileView` queda como cliente. Medido con `scripts/playwright/perf-02/measure-lounge.mjs` (390 px, CPU 4×, ~slow 4G): HTML con datos (antes no), título visible 1150–1470 → 500–840 ms, LCP 870–1340 → 500–900 ms, peticiones a Supabase desde el navegador 13 → 3. **TBT sube** de 0–120 a 100–320 ms: se hidrata la vista entera; baja al dejar en cliente solo las hojas interactivas (amenities, horario y contacto pueden ser servidor). La PWA no cachea esa ruta (`NetworkOnly` en `next.config.ts`).
- **Siguientes rutas:** analytics de admin y partner, `/my-pass`, perfil. Fuera: `/explore` y el flujo de reserva (interacción y modo offline).

### PERF-03 — Medium — `async-parallel` / duplicated fetching
- **Evidencia:** `src/lib/profile.ts:82,213` y helpers análogos (`admin.ts`, `membership.ts`, `partner-invite.ts`) llaman `supabase.auth.getUser()` (round-trip al servidor Auth) antes de cada query; una pantalla que llama varios helpers (perfil, membresía, favoritos, amenities) paga N validaciones de usuario secuenciales.
- **Impacto:** latencia extra por cada helper; si se encadenan con `await`, waterfall.
- **Fix:** resolver el usuario una vez (contexto/`getClaims`) y pasar `userId`, o dejar que RLS filtre con `auth.uid()` sin preguntar al servidor; agrupar en `Promise.all` las cargas independientes.
- **Cierre:** una carga de `/profile` hace como máximo 1 llamada `/auth/v1/user` (pestaña Network).

### PERF-04 — Low — `next-image`
- **Evidencia:** `src/app/admin/members/page.tsx:184`, `src/app/profile/page.tsx:145`, `src/components/admin/lounge-draft-form.tsx:554`, `lounge-live-view.tsx:131` (`onboarding/basics/page.tsx:79` es preview blob, aceptable).
- **Fix:** `next/image` con `remotePatterns` del Storage de Supabase.
- **Cierre:** sin `<img` salvo previews `blob:`.

### CONV-01 — Medium — convención del proyecto (capa 3 sin px)
- **Evidencia:** ~354 coincidencias `[NNpx]` en `src/app/**/page.tsx`, p. ej. `src/app/admin/analytics/demand/page.tsx:90,93,96,103,148` (`text-[11px]`, `text-[34px]`, `rounded-[11px]`, `border-[1.5px]`).
- **Impacto:** contradice CLAUDE.md ("una pantalla no escribe un px"); medidas duplicadas que divergen entre pantallas.
- **Fix:** subir a tokens/`cva` en `ui/` o `patterns/` (eyebrow, page title, toolbar button) y anotar en COMPONENT-MAP.
- **Cierre:** `grep -E "\[[0-9.]+px\]" src/app --include=page.tsx` → 0.

### A11Y-01 — Low — `img-alt`
- **Evidencia:** `lounge-draft-form.tsx:554`, `lounge-live-view.tsx:131` con `alt=""` en fotos que son contenido.
- **Fix:** `alt` con nombre del lounge / índice de foto.
- **Cierre:** fotos de contenido con alt descriptivo.

## Verificado sin hallazgo
- Realtime: `src/components/partner/today-dashboard.tsx:102-187` hace `removeChannel` en el cleanup; intervalos con `clearInterval`.
- Listeners: `stripe-checkout-bridge.tsx:83-94` y `src/lib/online-status.ts` eliminan listeners/observers.
- No se encontraron `{x.length && …}` (render de `0`) ni `onClick` en `div/span/li`.
- Diálogos sobre Radix (focus trap y Escape nativos).

## Pendiente
- Medir First Load JS por ruta con `npm run build` cuando nadie más esté construyendo.
- Revisión manual de contraste y foco visible en tema oscuro (no cubierta).
