# Auditoría — Dependencias y supply chain

Fecha: 2026-10-12 · Rama: `docs/project-audit` · Modo: solo lectura (sin instalar, actualizar ni tocar `package*.json`).
Amplía `docs/audit/ci-cd-y-entornos.md`: **CI-07** (npm audit, 14 vulns) y **CI-08** (actions por tag, `vercel@latest`). No se repiten aquí; se desglosan y priorizan.

## Evidencia ejecutada

| Comando | Resultado |
|---|---|
| `npm audit --omit=dev --json` | 14 (10 high, 4 moderate, 0 critical) — coincide con CI-07 |
| `npm audit --json` | 17 (13 high, 4 moderate) — +3 de dev (`eslint-config-next`, `@next/eslint-plugin-next`, `undici` vía jsdom) |
| `npm outdated` | ver DEP-08 |
| `npm view @ducanh2912/next-pwa time.modified` | `2024-09-18` (última versión 10.2.9) |
| `package-lock.json` | todas las `resolved` en `registry.npmjs.org`; sin deps git/url/file |
| `.github/dependabot.yml`, `renovate.json` | no existen |

Contexto de alcance: existe `middleware.ts` en la raíz; no hay `src/app/api/`, ni `"use server"` (0 server actions), ni `revalidate`/`generateStaticParams`; `next/image` se usa en 11 archivos; el despliegue es Vercel (no self-hosted).

## Resumen

| ID | Sev. | Título |
|---|---|---|
| DEP-02 | Medium | `@ducanh2912/next-pwa` abandonado (sin publicar desde sept 2024) y raíz de 9 de las 14 vulns |
| DEP-03 | Low | `sharp 0.35.4` (librsvg CVE) vía `next` |
| DEP-04 | Low | `postcss` / `source-map-js` vulnerables (solo build) |
| DEP-05 | Low | Vulns solo dev: `undici` (jsdom), `brace-expansion`, `fast-glob` en `eslint-config-next` (además desalineado: 16 vs next 15) |
| DEP-06 | Medium | Edge Functions: `npm:@supabase/supabase-js@2` con rango, esm.sh y sin `deno.lock` |
| DEP-07 | Low | Cuatro dependencias declaradas sin uso |
| DEP-08 | Low | Versiones atrasadas y desfase de majors (`next` 15 vs 16, eslint 9 deprecado) |
| DEP-09 | Info | Licencias: sin GPL/AGPL; LGPL-3.0 de libvips (binarios de sharp) |
| DEP-10 | Medium | Sin Dependabot/Renovate ni gate de `npm audit` en CI |
| DEP-11 | Info | Install scripts y lockfile: sanos |

---

### DEP-02 · Medium · `@ducanh2912/next-pwa` abandonado y origen de la mayoría de vulns
- **Evidencia:** `time.modified 2024-09-18`; arrastra `workbox-build@7.1.x`, `workbox-webpack-plugin`, `webpack`, `fast-glob→micromatch→braces`, `@rollup/plugin-terser→serialize-javascript`, `ajv→fast-uri@3.1.6`. El "fix" que propone npm es un **downgrade a 6.1.0** (`isSemVerMajor`): no es solución.
- **Alcanzabilidad:** build-time. `serialize-javascript` (RCE GHSA-5c6j-r48x-rmvq), `fast-uri`, `braces`, `micromatch` solo procesan entradas del propio repo durante `next build` (generación de `sw.js`); no llegan al bundle del navegador. Sí corren en el runner de CI/Vercel que tiene secretos (riesgo de supply chain, no de explotación remota).
- **Remediación:** sustituir por **`@serwist/next`** (sucesor mantenido, API similar) o retirarlo si la PWA no es requisito. Puente: `overrides` en `package.json` → `serialize-javascript ^7.0.5`, `fast-uri ^3.1.8`, y versiones parcheadas de `braces`/`brace-expansion`.
- **Cierre:** `npm audit --omit=dev` sin rutas por `next-pwa`/`workbox-*`, y `sw.js` sigue generándose en `npm run build`.

### DEP-03 · Low · `sharp` con librsvg vulnerable
- **Evidencia:** `next@15.5.25 → sharp@0.35.4`; GHSA-wq5f-xc86-pv6w (`<0.35.5`).
- **Alcanzabilidad:** baja. Solo lo usa el optimizador de `next/image` en self-hosted (`next start`); en Vercel optimiza la plataforma. Requiere SVG de entrada y `dangerouslyAllowSVG` no está activado en `next.config.ts`.
- **Remediación:** `next@15.5.27` sigue trayendo `0.35.4` (comprobado al cerrar DEP-01): `overrides: { "sharp": "0.35.5" }`.
- **Cierre:** `npm ls sharp` ≥ 0.35.5.

### DEP-04 · Low · `postcss` / `source-map-js` (build)
- **Evidencia:** `postcss@8.4.31` (interna de `next`) y `8.5.26` (`@tailwindcss/postcss`, `vite`): GHSA-qx2v-qp2m-jg93, -6g55-p6wh-862q, -fxqj-rqcc-2cmp, -r28c-9q8g-f849. `source-map-js@1.2.1` (`<1.2.2`).
- **Alcanzabilidad:** build-time sobre CSS propio (sin CSS de usuarios): no explotable en runtime.
- **Remediación:** `npm audit fix` (sin breaking) y/o `overrides`: `postcss` ≥ 8.5.23, `source-map-js ^1.2.2`.
- **Cierre:** `npm ls postcss source-map-js` fuera de los rangos citados.

### DEP-05 · Low · Vulnerabilidades solo de desarrollo
- **Evidencia:** `undici@7.29.0` (vía `jsdom`, 10 advisories, fix 7.29.1); `brace-expansion`; `eslint-config-next@16.3.3` → `@next/eslint-plugin-next` → `fast-glob`. `eslint-config-next` 16.x con `next` 15.x: desalineado.
- **Alcanzabilidad:** ninguna en producción; solo tests/lint locales y CI.
- **Remediación:** `npm audit fix` (undici 7.29.1, brace-expansion); alinear `eslint-config-next` con la major de `next` (15.5.27, o ambos a 16 en DEP-08). Ignorar la sugerencia de npm `eslint-config-next@14.2.35`.
- **Cierre:** `npm audit` completo = `npm audit --omit=dev`.

### DEP-06 · Medium · Imports de Edge Functions sin fijar ni lockfile
- **Evidencia:** 6 imports `npm:@supabase/supabase-js@2` (rango de major; p. ej. `supabase/functions/_shared/stripe-context.ts:7`); `npm:stripe@22.6.0` (fijado, 5 usos); `https://esm.sh/standardwebhooks@1.0.0` (versión fija, pero esm.sh recompila y sirve el artefacto desde un CDN de terceros). No hay `deno.json`, `import_map.json` ni `deno.lock` en `supabase/functions/`.
- **Alcanzabilidad:** runtime de producción (`stripe-webhook`, cobros, emails). Cada deploy puede resolver una `supabase-js` distinta a la probada en CI.
- **Remediación:** `supabase/functions/deno.json` con import map (`"@supabase/supabase-js": "npm:@supabase/supabase-js@2.117.3"`, `"stripe": "npm:stripe@22.6.0"`, `"standardwebhooks": "npm:standardwebhooks@1.0.0"`) y `deno.lock` versionado.
- **Cierre:** ningún `@2"` ni `https://esm.sh` en `supabase/functions`, y `deno.lock` comiteado.

### DEP-07 · Low · Dependencias declaradas sin uso
- **Evidencia** (grep de imports en `src/`, `scripts/`, configs): `@photostructure/tz-lookup`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-form`, `@radix-ui/react-select` — 0 imports. De Radix solo se importan `react-dialog` y `react-popover`. `jsdom`, `@vitest/ui`, `@testing-library/jest-dom` se usan por config de Vitest (correcto en dev). Ninguna devDep importada en runtime (`playwright` solo en `scripts/`).
- **Remediación:** desinstalar las cuatro o justificar su reserva (CLAUDE.md cita Select/DropdownMenu/Form como primitivas del stack).
- **Cierre:** toda entrada de `dependencies` tiene al menos un import.

### DEP-08 · Low · Versiones atrasadas y riesgo EOL
| Paquete | Actual | Wanted | Latest | Comentario |
|---|---|---|---|---|
| next | 15.5.25 | 15.5.27 | 16.4.0 | 1 major detrás; la major anterior recibe solo backports de seguridad por tiempo limitado (Inferred — verificar en la support policy oficial de Next.js) |
| react / react-dom | 19.2.8 (exacto) | — | 19.3.0 | minor |
| @supabase/supabase-js | 2.115.0 | 2.117.3 | 2.117.3 | patch |
| @supabase/ssr | 0.12.6 | 0.12.7 | 0.12.7 | patch (0.x: cada minor puede romper) |
| @stripe/stripe-js | 9.16.0 | 9.17.0 | 10.0.0 | 1 major |
| @stripe/react-stripe-js | 6.10.0 | 6.12.0 | 7.0.0 | 1 major |
| tailwindcss | 4.x | — | al día | — |
| vitest / @vitest/ui | 4.1.11 | — | 5.0.4 | 1 major (dev) |
| eslint | 9.39.5 | — | 10.12.0 | marcado **deprecado** en el lockfile ("no longer supported") |
| typescript | 5.9.3 | — | 7.0.2 | 2 majors (dev) |
| @types/node | 20.x | — | 26.x | Node 20 EOL (abril 2026): alinear con el Node de CI/Vercel |

- Deprecadas transitivas en el lockfile: `glob` antiguo, `inflight` (fuga de memoria), `sourcemap-codec` — llegan vía next-pwa/workbox (desaparecen con DEP-02).
- **Remediación:** `npm update` para patches/minors; plan por separado para `next 16` + `eslint-config-next 16`, `stripe-js 10`/`react-stripe-js 7`, eslint 10, vitest 5.
- **Cierre:** `npm outdated` sin "Wanted" pendientes; ticket por cada major.

### DEP-09 · Info · Licencias
- Directas: MIT/ISC/Apache-2.0/BSD, salvo `@photostructure/tz-lookup` (CC0-1.0, permisiva). Ninguna GPL/AGPL/desconocida.
- Transitivas: `@img/sharp-libvips-*` **LGPL-3.0-or-later** (libvips dinámica vía `sharp`). Uso en servidor sin distribución: sin obligación práctica.

### DEP-10 · Medium · Sin actualización automática ni gate de audit
- **Evidencia:** no hay `.github/dependabot.yml` ni `renovate.json`; los workflows no ejecutan `npm audit`.
- **Remediación:** `dependabot.yml` con `npm` (semanal, agrupando patches) y `github-actions` (resuelve CI-08); job `npm audit --omit=dev --audit-level=high` en `ci.yml` (con excepciones documentadas mientras DEP-02 siga abierto).
- **Cierre:** primer PR de Dependabot abierto y job de audit visible en CI.

### DEP-11 · Info · Lockfile e install scripts
- `resolved`: 100 % `registry.npmjs.org`; sin dependencias git/tarball/file.
- `hasInstallScript`: solo `fsevents` (x2, opcional macOS) y `unrs-resolver` (dev, eslint). Ninguna dependencia directa declara `postinstall`.
- Recomendación: `npm ci` en CI y `--ignore-scripts` donde no hagan falta.

## Priorización
1. `npm audit fix` (DEP-04/05): patches, bajo riesgo.
2. DEP-06 (fijar imports Deno) y DEP-10 (Dependabot + gate).
3. DEP-02 (migrar a `@serwist/next`): elimina 9 vulns y las deprecadas.
4. DEP-07 y DEP-08 (limpieza y majors planificadas).
