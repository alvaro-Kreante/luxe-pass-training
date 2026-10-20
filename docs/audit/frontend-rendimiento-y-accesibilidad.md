# Auditoría frontend — rendimiento y accesibilidad

Fecha: 2026-10-12 · Rama: `docs/project-audit` · Alcance: `src/app`, `src/components`, `src/lib`. Auditoría de solo lectura, con muestreo por grep y lectura dirigida (no exhaustiva). `npm run build` no se ejecutó (existe `.next-build` y no se pudo descartar otra sesión): **First Load JS por ruta queda pendiente de medir**.

## Resumen

| ID | Sev. | Tema |
|---|---|---|
| PERF-01 | Low | Google Maps (14 KB gz) en el JS inicial de `/explore` y admin lounges; Recharts y Stripe sin coste real (medido 20 oct 2026) |
| PERF-02 | High | Las 52 páginas son `"use client"`: sin Server Components |
| PERF-03 | Medium | `auth.getUser()` (petición de red) repetido en cada helper de `src/lib` |
| PERF-04 | Low | `<img>` sin `next/image` (5 casos) |
| CONV-01 | Medium | ~354 valores arbitrarios `[..px]` en páginas (capa 3) |
| A11Y-01 | Low | `alt=""` en fotos de lounge con contenido |
| OK | — | Realtime y listeners con limpieza correcta |

## Hallazgos

### PERF-01 — Low — `bundle-dynamic-imports` (reclasificado de High el 20 oct 2026)
- **Medido sobre `dev` (build de producción, gzip, `app-build-manifest.json`):** ninguna librería pesada está en el bundle compartido. Recharts: 0 KB (`components/charts/` no se importa en ninguna ruta, ver PERF-15). Google Maps (`@vis.gl/react-google-maps`): un chunk de 14 KB en `/explore`, `/admin/lounges/[id]` y `/admin/lounges/new`. Stripe (`@stripe/react-stripe-js`): chunks de 5–6 KB solo en `/book` y `/profile/membership*`; Stripe.js se descarga solo al pagar desde PERF-11. El peso inicial real es framework (~100 KB, todas las rutas) y supabase-js (~67 KB, todas las rutas): eso es PERF-02, no carga diferida.
- **Impacto:** ≈ 6 % del JS inicial de `/explore` (14 de 246 KB).
- **Fix posible:** `next/dynamic` del mapa y del diálogo de ubicación manual de `/explore` (el diálogo comparte módulo con el de permiso, que se abre al entrar: habría que separarlos). No se hace por ahora: el ahorro no compensa tocar el flujo de ubicación.
- **Cierre:** decidir si se hace el split de 14 KB o se acepta.

### PERF-02 — High — `server-client-boundary` / `use-client-overuse`
- **Evidencia:** 52 `page.tsx` con `"use client"` en la primera línea; toda la carga de datos va por `useEffect` + cliente Supabase en navegador.
- **Impacto:** HTML sin datos → spinner + waterfall (JS → auth → query); todo el árbol se hidrata.
- **Fix:** progresivo: páginas de solo lectura (`/lounges/[id]`, admin analytics, listas) como Server Component con `@supabase/ssr` y hojas interactivas como client components. Coherente con la regla de no crear `src/app/api/`.
- **Cierre:** al menos las rutas de lectura principales renderizan datos en el HTML del servidor; `"use client"` solo en componentes hoja.
- **Avance (20 oct 2026) — piloto `/lounges/[id]`:** Server Component con `requireSession()` en `app/lounges/[id]/layout.tsx` (redirección 307 antes del streaming) y `loadLoungeProfile` (perfil + fotos, disponibilidad, favorito y temporadas en paralelo). La vista se renderiza en el servidor y solo son cliente tres islas (`LoungeQuickActions`, `LoungeGallery`, `LiveAvailabilityCard`). Medido con `scripts/playwright/perf-02/measure-route.mjs` (390 px, CPU 4×, ~slow 4G), las dos versiones servidas a la vez en puertos distintos y cargas intercaladas: HTML con datos (antes no), título visible 1860–2500 → 720–810 ms, LCP 1770–2570 → 700–850 ms, peticiones a Supabase desde el navegador 13 → 3. TBT en un rango parecido (63–211 → 114–204 ms); las islas solo ahorran ~3 kB de JS de la ruta (9,4 → 6,2 kB), sin cambio medible de TBT. La PWA no cachea esa ruta (`NetworkOnly` en `next.config.ts`).
- **Avance (20 oct 2026) — `/my-pass`:** `loadMyPass` (reservas próximas y pasadas, visitas del mes y membresía en paralelo) en el servidor; `MyPassView` en servidor con una isla cliente (`MyPassBookings`: pestañas, listas y cancelar) y los paneles laterales renderizados en el servidor. Medido igual que el piloto: HTML con datos (antes no), título visible 940–1350 → 720–990 ms, LCP 910–1210 → 400–500 ms, peticiones a Supabase desde el navegador 9 → 4, TBT sin cambio (167–210 → 113–215 ms). `NetworkOnly` también para `/my-pass` (no para `/my-pass/<reference>`, que sigue en cliente).
- **Siguientes rutas:** analytics de admin y partner, perfil. Fuera: `/explore` y el flujo de reserva (interacción y modo offline).

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
