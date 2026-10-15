# Auditoría — GitHub, CI/CD y entornos

Fecha: 2026-10-12 · Repo: `alvaro-Kreante/luxe-pass-training` (privado) · Rama: `docs/project-audit` (desde `dev` `eae116a`) · Método: Kreante project-audit (checklist §7, §8 + delivery gate).
Solo lectura: `gh api` de consulta, `npm ci --dry-run`, `npm audit --omit=dev`. No se imprimieron valores de secretos.

## Resumen

| Severidad | Nº |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 4 |
| Low | 3 |
| Info | 1 |

Gate de entrega: **NO APTO para Production**. Bloquean: producción atrasada sin release ensayado (CI-01), ramas sin protección (CI-04), sin observabilidad (CI-06).

## Tabla de checks

| Check | Resultado | Evidencia |
|---|---|---|
| Workflows con `permissions` mínimos | PASS | `contents: read` en `ci.yml` y `deploy.yml` |
| Actions fijadas por SHA | FAIL | `@v4`/`@v1` por tag; `vercel@latest` (CI-08) |
| CI en PR: lint/typecheck/build/test | PASS | `ci.yml` 4 jobs en `pull_request` a dev/staging/main |
| CI ejecuta tests con BD real | PASS | `supabase start` + `functions serve` + `npm test` |
| Protección de ramas / rulesets | BLOCKED/FAIL | API 403 "Upgrade to GitHub Pro" (CI-04) |
| Environments con aprobación | FAIL | `dev` y `production` con `protection_rules: []` |
| Lockfile único | PASS | solo `package-lock.json` |
| `npm ci` reproducible | PASS | `npm ci --dry-run` sin errores |
| Versión de Node fijada | FAIL | sin `engines`/`.nvmrc`; CI usa Node 24 (CI-10) |
| `npm audit --omit=dev` | FAIL | 14 vulns (10 high, 4 moderate), incl. `next` directo (CI-07) |
| `.env.example` completo | FAIL | faltan claves de Google Maps y de tests (CI-09) |
| `supabase/functions/.env.example` completo | PASS | cubre las 15 variables `Deno.env.get` propias |
| Secretos fuera del repo | PASS | `.env`, `.env.local`, `functions/.env` no versionados |
| Aislamiento Staging/Prod | PASS | 2 Supabase + 2 Vercel + secretos `_DEV`/`_PROD`, Stripe por entorno |
| Producción al día | FAIL | `main` 2026-09-13 (498 archivos) vs `staging` 2026-10-07 (821) vs `dev` (825) |
| Observabilidad / error tracking | FAIL | sin Sentry/analytics/alertas (CI-06) |
| Backups / PITR | BLOCKED | plan Supabase no verificable sin acceso; no documentado |
| Advisors de Supabase en deploy | PASS con nota | corren con `continue-on-error: true` (no bloquean) |

## Findings

### CI-01 · Critical · Producción un mes atrasada: 58 migraciones y 4 epics sin promover, sin plan de release
- **Ubicación:** ramas `origin/main` (`ce43752`, 2026-09-13) vs `origin/staging` (`be8a19e`, 2026-10-07) vs `origin/dev` (`eae116a`).
- **Estado:** Confirmed.
- **Evidencia:** `main` 498 archivos, `staging` 821, `dev` 825. `git diff --stat origin/main origin/staging -- supabase/migrations`: 58 archivos, +49.589 líneas. `docs/ci-cd/RESUMEN.md:396-403` deja sin decidir cómo se promueve `staging → main`.
- **Impacto:** el próximo merge a `main` aplicará de golpe 58 migraciones (incl. rediseño partner = organización, Epic 10) sobre `luxepass-prod` en un solo `db push`, sin ensayo documentado. Riesgo alto de despliegue fallido a medias (migraciones aplicadas, functions/Vercel no), con datos reales.
- **Remediación:** ensayo del release sobre una copia de prod (branch de Supabase o restore en proyecto temporal); checklist de release con secretos de Vault a dar de alta antes del push; tag `vX.Y.Z` en `main` antes y después; ventana de release acordada; decidir política de promoción.
- **Cierre:** release ensayado y documentado, `main` alineado con `staging`, tag creado, smoke test de flujos críticos en prod.

### CI-04 · High · Sin protección de ramas ni aprobación de environments
- **Ubicación:** GitHub settings; `docs/ci-cd/RESUMEN.md:43-44`.
- **Estado:** Confirmed. **Evidencia:** `gh api .../branches/{main,staging,dev}/protection` y `/rulesets` → 403 "Upgrade to GitHub Pro or make this repository public". Environments `dev` y `production` con `protection_rules: []`.
- **Impacto:** cualquier colaborador con escritura puede hacer push directo a `main` y migrar producción al instante; la regla "solo por PR" depende de disciplina. Prod no requiere aprobación humana.
- **Remediación:** plan GitHub Team/Pro u organización con protección (PR obligatorio + checks `lint/typecheck/build/test` requeridos) en `main`/`staging`/`dev`; required reviewers en environment `production`.
- **Cierre:** `gh api .../branches/main/protection` devuelve reglas activas; environment `production` con revisor.

### CI-06 · Medium (bloqueante para prod) · Sin observabilidad ni error tracking
- **Ubicación:** `package.json`, `src/**` (sin Sentry/analytics/logging externo).
- **Estado:** Confirmed (código) / Inferred (no hay alertas en Supabase/Vercel; no verificable sin acceso).
- **Impacto:** fallos de webhook de Stripe, crons o Edge Functions en prod pasarían desapercibidos hasta que reclame un cliente; afecta pagos.
- **Remediación:** Sentry (Next.js + Deno), alertas de fallos de webhook en Stripe Dashboard, monitor de `cron.job_run_details` con fallos, uptime check.
- **Cierre:** error de prueba visible en el tracker y alerta recibida por el responsable.

### CI-07 · Medium · Dependencias de runtime con vulnerabilidades conocidas
- **Ubicación:** `package.json:31` (`next ^15.5.25`), `@ducanh2912/next-pwa`, transitivas (`postcss`, `sharp`, `serialize-javascript`, `fast-uri`, `braces`…).
- **Estado:** Confirmed. **Evidencia:** `npm audit --omit=dev`: 14 vulnerabilidades (10 high, 4 moderate). `next` (moderate): cache poisoning SSG/ISR "en aplicaciones self-hosted" — en Vercel el impacto es menor (Inferred). Muchas high son de build (workbox/next-pwa).
- **Remediación:** `npm audit fix`, subir `next` al último 15.5.x parcheado, evaluar sustituir `@ducanh2912/next-pwa`; Dependabot/Renovate.
- **Cierre:** `npm audit --omit=dev` sin high en dependencias que lleguen al runtime.

### CI-08 · Medium · Actions y CLIs sin fijar
- **Ubicación:** `.github/workflows/*.yml` (`actions/checkout@v4`, `actions/setup-node@v4`, `supabase/setup-cli@v1`); `deploy.yml` `npm install --global vercel@latest`.
- **Estado:** Confirmed. **Impacto:** supply chain y builds no reproducibles en el job que tiene `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN` y claves Stripe de prod. **Remediación:** fijar por SHA y versión exacta de Vercel CLI; Dependabot para actions. **Cierre:** ningún `uses:` por tag ni `@latest`.

### CI-09 · Medium · `env.example` incompleto (y con nombre no estándar)
- **Ubicación:** `env.example` (raíz).
- **Estado:** Confirmed. **Evidencia:** declara `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. El código usa además `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` y los tests `STRIPE_SECRET_KEY`, `MEMBERSHIP_RENEWAL_WEBHOOK_SECRET`. Archivo llamado `env.example` en vez de `.env.example`.
- **Impacto:** setup de un desarrollador nuevo o del cliente falla en mapa y tests. **Remediación:** añadir las 4 variables (sin valores) y renombrar/duplicar a `.env.example`. **Cierre:** cada `process.env.*` tiene entrada documentada.

### CI-10 · Low · Versión de Node no fijada
- `package.json` sin `engines`, sin `.nvmrc`; CI usa Node 24; Vercel usa su default del proyecto. **Remediación:** `engines.node` + `.nvmrc` alineados con Vercel. **Cierre:** misma versión en local, CI y Vercel.

### CI-11 · Low · Advisors de Supabase no bloquean y sus resultados no se revisan formalmente
- `deploy.yml` `supabase db advisors --linked` con `continue-on-error: true`. **Remediación:** fallar en nivel ERROR o publicar el resultado como artefacto/resumen. **Cierre:** política documentada y aplicada.

### CI-12 · Low · Pasos manuales de Vault fuera del pipeline
- `docs/ci-cd/VAULT-SECRETS.md`; los secretos de Vault de cada cron se dan de alta a mano en Studio y `db reset` los borra. **Impacto:** deriva entre entornos, crons silenciosamente rotos. **Remediación:** checklist de verificación post-deploy (query a `vault.decrypted_secrets` por nombre, sin valor). **Cierre:** check automatizado o checklist firmado por release.

### CI-13 · Info · Backups y PITR no verificados
- Sin acceso al plan de `luxepass-prod`; no documentado en `docs/ci-cd/RESUMEN.md`. Estado BLOCKED: confirmar plan (PITR requiere Pro + add-on) y probar un restore.

## Controles positivos

- `permissions: contents: read` en ambos workflows; `concurrency` en deploy sin cancelar en curso.
- CI completo en cada PR: lint, typecheck, build y suite real con Supabase efímero y Edge Functions servidas.
- Orden de despliegue correcto: migración → secrets → functions → Vercel (auto-deploy nativo de Vercel desactivado).
- Aislamiento real de entornos: 2 Supabase, 2 Vercel, secretos y cuentas Stripe separados por sufijo `_DEV`/`_PROD`; `APP_ENV` prefija asuntos de email.
- Lockfile único y `npm ci` reproducible; secretos solo en GitHub Secrets/Vault, nunca en el repo.
- Documentación operativa extensa (`RESUMEN.md`, `GUIA-PASO-A-PASO.md`, `VAULT-SECRETS.md`, `EPIC-10-DESPLIEGUE.md`).
