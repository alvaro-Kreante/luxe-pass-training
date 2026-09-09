# CI/CD para LuxePass — Resumen del plan

> Este archivo existe para no tener que re-explicar el contexto si se limpia la
> sesión de Claude Code. Léelo primero; el detalle de ejecución está en
> `GUIA-PASO-A-PASO.md` en esta misma carpeta.

## Por qué esto existe ahora

LuxePass empezó como un mockup navegable sin backend (ver `CLAUDE.md` §"Alcance:
esto es SOLO frontend"). Eso ya no es así: desde la rama `staging` hay lógica
real conectada a Supabase (Story 1.1 y 1.2 del Epic 1, commits `fd44c04` y
`6432d51`). `CLAUDE.md` todavía describe la fase de mockup — **hay que
actualizarlo** una vez que este plan de CI/CD esté implementado (ver Fase 10 de
la guía).

## Objetivo

Que exista un pipeline de CI/CD real:

- Los tests corren automáticamente en cada Pull Request.
- Nada llega a producción sin pasar los tests.
- Las migraciones de base de datos se aplican solas, sin que nadie corra un
  comando a mano contra una base remota.
- Hay un ambiente de "dev" en Vercel para probar antes de que algo llegue a
  producción, sin pagar por un Supabase de staging separado y caro.

## Topología decidida

| Cosa | Decisión |
|---|---|
| Repositorios de GitHub | **1 solo** (el que ya existe). No se crea un segundo repo. |
| Ramas de integración | `staging` (dev/preview) y `main` (producción) |
| Proyectos de Supabase | **2**, ambos remotos: uno de dev/staging, uno de producción |
| Proyectos de Vercel | **2**, ambos apuntando al mismo repo de GitHub: el de producción trackea `main` como su "Production Branch", el de dev trackea `staging` |

**Aclaración clave:** un "proyecto de Vercel" no es lo mismo que un
repositorio de GitHub. Los 2 proyectos de Vercel se conectan al mismo repo,
cada uno mira una rama distinta.

## Flujo de trabajo pensado

```
feature/xxx → PR hacia staging
                  │
                  ▼
            CI corre: lint, tsc, tests, build
                  │ (si pasa)
                  ▼
            merge a staging
                  │
                  ▼
    GitHub Actions: migra Supabase DEV, luego release a Vercel DEV
                  │
                  ▼
        (cuando se decide promover a producción)
            PR staging → main
                  │
                  ▼
            CI corre la misma batería de tests
                  │ (si pasa)
                  ▼
          auto-merge a main
                  │
                  ▼
   GitHub Actions: migra Supabase PROD, luego release a Vercel PROD
```

El release a Vercel se dispara **desde GitHub Actions** (no se deja el
auto-deploy nativo de Vercel al detectar el push) para poder garantizar el
orden: primero la migración de base de datos, después el deploy del código
nuevo. Si se deja el auto-deploy de Vercel suelto, puede desplegar el código
nuevo antes de que la migración haya terminado.

## Excepción importante a una regla ya escrita en `CLAUDE.md`

`CLAUDE.md` dice ahora mismo: *"nunca `supabase link` a un proyecto remoto,
nunca `db push`/`db pull` sin `--local`"*. Esa regla sigue rigiendo para
cualquier desarrollador trabajando en su máquina — nadie debe enlazar su
Supabase local a un proyecto remoto a mano.

**La excepción es el pipeline de CI**: GitHub Actions sí necesita hacer
`supabase link --project-ref <ref>` + `supabase db push` contra el proyecto
remoto correspondiente (dev o prod), usando tokens guardados como GitHub
Secrets — nunca credenciales sueltas en el código ni en el `.env` de nadie.
Es una excepción acotada al runner de CI, no una vía libre para que alguien la
use en local.

## Estado actual (ir tachando conforme se avance)

- [x] `staging` sincronizada con `main` (estaba retrasada, ya se hizo
      fast-forward y push).
- [x] Rama `chore/ci-cd-pipeline-setup` creada desde `staging` ya sincronizada,
      para probar todo este plan sin tocar `staging` directamente.
- [x] Proyecto Supabase de dev/staging creado (`luxepass-dev`, 8 sept 2026).
- [x] Proyecto Supabase de producción creado (`luxepass-prod`, 8 sept 2026).
- [x] Primera aplicación del schema a `luxepass-dev` (8 sept 2026, confirmada
      en el run de `deploy.yml`: las 2 migraciones se aplicaron). Falta la de
      `luxepass-prod`, que llega con el PR `staging` → `main`.
- [ ] Cuenta de Vercel creada.
- [ ] Proyecto de Vercel "dev" creado (trackeando `staging`).
- [ ] Proyecto de Vercel "prod" creado (trackeando `main`).
- [ ] Variables de entorno configuradas en cada proyecto de Vercel.
- [x] Secrets configurados en GitHub (8 sept 2026): `SUPABASE_ACCESS_TOKEN`,
      `SUPABASE_DEV_PROJECT_REF`, `SUPABASE_DEV_DB_PASSWORD`,
      `SUPABASE_PROD_PROJECT_REF`, `SUPABASE_PROD_DB_PASSWORD`.
- [x] `.github/workflows/ci.yml` creado (8 sept 2026) — lint, `tsc --noEmit`,
      tests (levanta Supabase local en el runner) y build, en 4 jobs
      paralelos. Corre en PR y push a `staging`/`main`.
- [x] `.github/workflows/deploy.yml` creado (8 sept 2026) — **solo la parte de
      migraciones a Supabase remoto** (`supabase link` + `db push` a dev/prod
      según la rama). El release a Vercel se añade a los mismos jobs cuando
      existan esos proyectos (Fase 3-4).
- [ ] Protección de rama configurada en GitHub (`main` y `staging`).
- [x] PR #1 (`chore/ci-cd-pipeline-setup` → `staging`) mergeado — `ci.yml` en
      verde completo, `deploy.yml` migró `luxepass-dev` de verdad.
- [x] PR #2 (fix de `supabase db advisors --linked`, ver más abajo) mergeado
      — confirmado corriendo contra `luxepass-dev`: 2 warnings de seguridad,
      ambos ya conocidos y deliberados (`email_exists` y `check_login_lock`
      como `SECURITY DEFINER` anti-enumeración, ver Story 1.1/1.2 en
      `docs/PENDIENTES.md` §Resueltos) — no son nuevos, no requieren acción.
- [ ] Falta probar el PR `staging` → `main` para confirmar la migración a
      `luxepass-prod` (Fase 8 de la guía).
- [ ] `CLAUDE.md` actualizado: quitar/matizar §"Alcance: SOLO frontend" y
      documentar la excepción de CI a la regla de Supabase local.

### De paso, verificando que `ci.yml` y `deploy.yml` fueran a estar en verde

Cinco bugs reales encontrados y arreglados (ninguno se había notado porque
nada corría `lint`/`test`/`build`/migraciones de forma automática hasta
ahora):

- [x] `client.ts`/`server.ts`/`middleware.ts` leían
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, pero `.env.local` ya usa el nombre
      nuevo de Supabase (`PUBLISHABLE_KEY`) — 8 archivos de test fallaban.
- [x] `npm run lint` daba 25 errores en `scripts/playwright/**` (scripts de
      verificación visual, no de la app) — excluidos del lint.
- [x] `package-lock.json` estaba en `.gitignore` desde el scaffolding
      inicial — nunca se subió al repo, así que `npm ci` fallaba en CI con
      "Dependencies lock file is not found". Versionado.
- [x] `next build` prerrenderiza páginas que instancian el cliente de
      Supabase (@supabase/ssr valida que URL/key no vengan vacíos aunque no
      hace red ahí) — el job `build` de `ci.yml` necesitó un valor no vacío,
      no necesariamente real.
- [x] El job `test` parseaba `supabase status` como texto plano; el CLI
      instalado usa una tabla con bordes Unicode y JSON con claves planas
      (`API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`, con `ANON_KEY`/
      `SERVICE_ROLE_KEY` como alias legacy) — cambiado a `-o json` + `jq`
      con los paths correctos, confirmados contra un run real.
- [x] `supabase db advisors` en `deploy.yml` fallaba con ECONNREFUSED: sin
      `--linked`, revisa la base local (que no existe en ese job) en vez del
      proyecto remoto recién enlazado. Agregado `--linked` a ambos jobs
      (dev y prod).

`npm test` confirmado 100% en verde en CI (job `test` del PR #1, con Supabase
local real levantado en el runner). La migración a `luxepass-dev` y los
advisors contra el proyecto real, confirmados en el PR #2. Ver filas en
`docs/PENDIENTES.md` §Resueltos.

Nota aparte, sin acción: al reintentar el deploy tras el PR #2, un job falló
una vez con "Failed to resolve latest Supabase CLI release: rate limit
exceeded" (`supabase/setup-cli@v1` contra la API de GitHub) — transitorio,
se resolvió solo con `gh run rerun --failed`.

## Decisiones que todavía faltan por tomar

1. **¿Cómo se abre el PR de `staging` → `main`?** ¿Manual (alguien decide
   "ahora sí, a producción") o automático en cada push a `staging`? Se
   recomendó manual para tener control sobre el momento del release, pero
   falta confirmarlo.
2. Confirmar si los 2 proyectos de Supabase y los 2 de Vercel ya existen o
   hay que crearlos desde cero (la guía asume que hay que crearlos).

## Dónde está cada cosa

- Este resumen: `docs/ci-cd/RESUMEN.md`
- Guía de ejecución paso a paso: `docs/ci-cd/GUIA-PASO-A-PASO.md`
- Rama de trabajo/pruebas: `chore/ci-cd-pipeline-setup` (creada a partir de
  `staging`)
- Reglas de Supabase local ya existentes: `CLAUDE.md` §"Supabase Local
  Development"
