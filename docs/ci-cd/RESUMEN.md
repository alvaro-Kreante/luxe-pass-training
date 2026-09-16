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
- [x] Primera aplicación del schema a `luxepass-dev` **y** `luxepass-prod` (8
      sept 2026, confirmada en los runs de `deploy.yml`: las 2 migraciones se
      aplicaron en ambos). `db advisors --linked` corrió contra los dos:
      mismos warnings ya conocidos y deliberados de `login_attempts`/
      `email_exists` (RPC `SECURITY DEFINER` para `anon`/`authenticated`).
- [x] Cuenta de Vercel creada.
- [x] Proyecto de Vercel `luxepass-dev` creado (trackeando `staging`).
- [x] Proyecto de Vercel `luxepass-prod` creado (trackeando `main`).
- [x] Variables de entorno configuradas en cada proyecto de Vercel
      (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      como Config, no Secret — apuntando cada uno a su Supabase
      correspondiente). Auto-deploy en push desactivado en ambos
      (Settings → Git → Ignored Build Step → `exit 0`), el deploy lo
      disparará `deploy.yml` desde GitHub Actions.
- [x] Secrets configurados en GitHub: `SUPABASE_ACCESS_TOKEN`,
      `SUPABASE_DEV_PROJECT_REF`, `SUPABASE_DEV_DB_PASSWORD`,
      `SUPABASE_PROD_PROJECT_REF`, `SUPABASE_PROD_DB_PASSWORD` (8 sept 2026);
      `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_DEV`,
      `VERCEL_PROJECT_ID_PROD` (10 sept 2026).
- [x] `.github/workflows/ci.yml` creado (8 sept 2026) — lint, `tsc --noEmit`,
      tests (levanta Supabase local en el runner) y build, en 4 jobs
      paralelos. Corre en PR y push a `staging`/`main`.
- [x] `.github/workflows/deploy.yml` creado (8 sept 2026) — migraciones a
      Supabase remoto (`supabase link` + `db push` a dev/prod según la
      rama). Ampliado (10 sept 2026) con el release a Vercel: tras la
      migración, cada job instala el CLI de Vercel y corre `vercel pull` +
      `vercel build --prod` + `vercel deploy --prebuilt --prod` contra el
      proyecto correspondiente (`luxepass-dev` en `migrate-dev`,
      `luxepass-prod` en `migrate-prod`), usando `VERCEL_TOKEN`,
      `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID_DEV`/`VERCEL_PROJECT_ID_PROD`.
- [x] Primer deploy real de punta a punta probado (11-12 sept 2026): 3 bugs
      reales encontrados y arreglados, ver más abajo. Run en verde
      confirmado: `migrate-dev` completo (`supabase link` → `db push` →
      advisors → `vercel build` → `vercel deploy`).
- [ ] Protección de rama configurada en GitHub (`main` y `staging`) —
      **bloqueado, no solo pendiente**: el repo es privado y tanto la API de
      branch protection clásica como la de rulesets devuelven `403
      "Upgrade to GitHub Pro or make this repository public to enable this
      feature"` (confirmado 11-12 sept 2026). Hace falta plan de pago
      (Pro/Team) o hacer el repo público — ninguna de las dos es una
      decisión técnica. Detalle en `docs/PENDIENTES.md` §4.1.
- [x] PR #1 (`chore/ci-cd-pipeline-setup` → `staging`) mergeado — `ci.yml` en
      verde completo, `deploy.yml` migró `luxepass-dev` de verdad.
- [x] PR #2 (fix de `supabase db advisors --linked`, ver más abajo) mergeado
      — confirmado corriendo contra `luxepass-dev`: 2 warnings de seguridad,
      ambos ya conocidos y deliberados (`email_exists` y `check_login_lock`
      como `SECURITY DEFINER` anti-enumeración, ver Story 1.1/1.2 en
      `docs/PENDIENTES.md` §Resueltos) — no son nuevos, no requieren acción.
- [x] PR #4 (`staging` → `main`) mergeado — confirmada la migración real a
      `luxepass-prod`. **El ciclo completo de Supabase por CI (Fase 8) está
      probado de punta a punta, en dev y en producción.**
- [x] `CLAUDE.md` actualizado (9a12c58, 10 sept 2026): §"Alcance" ahora
      describe la fase de backend real parcial (Epic 1 conectado a Supabase,
      resto en mockup) y documenta la excepción de CI a la regla de Supabase
      local.
- [x] `.github/workflows/deploy.yml` ampliado (13 sept 2026, rama
      `feat/brevo-email-hook`) con el despliegue de la Edge Function
      `send-email` (Story 1.1/1.2 — envío de email transaccional vía Brevo en
      vez del SMTP simulado): `supabase secrets set` + `supabase functions
      deploy send-email --no-verify-jwt`, en ambos jobs, justo después de
      `db advisors`.
- [x] Secrets nuevos en GitHub cargados por el usuario (13 sept 2026):
      `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`,
      `APP_URL_DEV`, `APP_URL_PROD`, `SEND_EMAIL_HOOK_SECRET_DEV`,
      `SEND_EMAIL_HOOK_SECRET_PROD`.
- [x] Registro del Auth Hook "Send Email" hecho a mano en los dashboards de
      `luxepass-dev` y `luxepass-prod` (13 sept 2026) — **decisión
      explícita: manual, no vía `supabase config push`** (ese comando
      sincroniza *todo* `config.toml` contra el proyecto remoto, no solo el
      hook — riesgo de pisar `site_url`, redirect URLs u otra config de Auth
      ya puesta a mano en el dashboard).
- [x] Rate limit de envío de email subido a mano en ambos dashboards (bug
      #4 abajo) — sin esto el hook nunca se invocaba pasadas las primeras
      pruebas.
- [x] Probado de punta a punta con email real (Brevo) en `luxepass-dev` y en
      `luxepass-prod`: signup, confirmación y forgot-password, los tres
      funcionando (13 sept 2026). PRs #12, #13, #14 (`staging`) y #15
      (`staging` → `main`).

#### Secrets de GitHub a añadir para `send-email` (13 sept 2026)

Un solo token de Brevo compartido entre dev y prod (decisión del usuario);
el secreto del Auth Hook si es por proyecto, porque lo genera cada dashboard
al crear el hook:

| Secret | Alcance | Valor |
|---|---|---|
| `BREVO_API_KEY` | Repo (compartido) | API key de Brevo (`app.brevo.com` → SMTP & API → API Keys) |
| `BREVO_SENDER_EMAIL` | Repo (compartido) | Remitente verificado en Brevo |
| `BREVO_SENDER_NAME` | Repo (compartido) | p. ej. `LuxePass` |
| `SEND_EMAIL_HOOK_SECRET_DEV` | Repo | Lo genera el dashboard de `luxepass-dev` al crear el hook (Authentication → Hooks → Send Email) |
| `SEND_EMAIL_HOOK_SECRET_PROD` | Repo | Igual, pero en `luxepass-prod` |
| `APP_URL_DEV` | Repo | URL pública del deploy de Vercel que trackea `staging` (`luxepass-dev`) |
| `APP_URL_PROD` | Repo | URL pública del deploy de Vercel que trackea `main` (`luxepass-prod`) |

`APP_ENV` (`STAGING`/`PROD`) no es secret — va literal en `deploy.yml`, cada job
con el suyo. En local es `APP_ENV=LOCAL` en `supabase/functions/.env`.

#### Cinco bugs reales encontrados llevando esto a producción (13 sept 2026)

1. **Puerto equivocado en el hook.** `uri` del `[auth.hook.send_email]` tenía
   `host.docker.internal:54321` (el puerto *default* de Supabase, copiado
   literal de la documentación) en vez de `54331` (el puerto real de este
   proyecto, `[api] port` en `config.toml`). Síntoma: `422 Failed to reach
   hook within maximum time of 5.000000 seconds` en el signup, nada en los
   logs de Brevo (la request nunca llegó a la function). Diagnosticado con
   `docker logs supabase_auth_Luxe_Pass`, que loguea la `uri` exacta que
   intentó alcanzar.
2. **`email_data.site_url` del payload del hook no es `auth.site_url`.**
   Devuelve el host:puerto del API de Supabase (`127.0.0.1:54331` en local),
   no el del dev server de Next (`127.0.0.1:3000`) — al contrario que
   `{{ .SiteURL }}` en los templates SMTP de `supabase/templates/`, que sí
   resuelve a `auth.site_url`. La function ahora usa su propio secret
   `APP_URL` en vez de ese campo del payload, con un valor explícito por
   ambiente (ver tabla arriba).
3. **`env(SEND_EMAIL_HOOK_SECRET)` no resolvía en CI.** El CLI valida *todo*
   `config.toml` en cualquier comando, no solo en los pasos que tocan la
   function — así que `supabase db push` (el primer paso del job, antes de
   llegar siquiera a `secrets set`/`functions deploy`) fallaba con `Invalid
   hook config: ... secrets must be formatted as v1,whsec_...`.
   `supabase secrets set` configura secrets del *proyecto remoto* para las
   Edge Functions — un mecanismo completamente distinto del `env()` que lee
   `config.toml`, que resuelve de las variables de entorno del *job* de
   GitHub Actions. Arreglo: `SEND_EMAIL_HOOK_SECRET_DEV`/`_PROD` ahora
   también están en el `env:` de cada job (no solo en el paso `secrets set`).
   PR #13 (`fix/send-email-hook-secret-ci-env` → `staging`).
4. **Rate limit de Auth agotado — no es un bug de código, es config de
   plataforma.** Con el hook y la function ya funcionando de verdad en
   `luxepass-dev` (signup real confirmado), el forgot-password no llegaba —
   nada en los logs de la function (el hook nunca se invocó), y en
   Authentication → Logs del dashboard aparecía un error de rate limit.
   Causa: `Authentication → Rate Limits → Rate limit for sending emails`
   viene en **2/hora por defecto** en un proyecto nuevo, y aplica **aunque
   el envío real vaya por un Hook custom a Brevo** — no es un límite del
   mailer nativo de Supabase, es un límite general de abuso sobre el propio
   endpoint de Auth. Las pruebas de signup ya lo habían agotado. Es el mismo
   parámetro que en local ya está subido a 300 (`config.toml`, comentario en
   `[auth.rate_limit]`) — ahí sí tiene efecto, cosa que el comentario
   original de Story 1.1 no anticipaba ("sin efecto en producción"). Se
   subió a mano en el dashboard de `luxepass-dev` (no vía `config push`,
   mismo motivo que el hook) y el forgot-password funcionó. Repetido en
   `luxepass-prod` — mismo síntoma, mismo arreglo, confirmado con email real.
5. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de Vercel `luxepass-prod`
   desactualizada — "Invalid API key" en signup/login.** No es un bug de
   este trabajo (la variable se configuró el 10 sept, antes de todo esto),
   pero salió a la luz probando el flujo completo en prod por primera vez.
   La URL (`NEXT_PUBLIC_SUPABASE_URL`) apuntaba bien al proyecto correcto;
   la key publicable horneada en el build no coincidía con ninguna key
   vigente de `luxepass-prod` — probablemente rotada en Supabase sin
   actualizar Vercel. Diagnosticado comparando el bundle JS servido en
   producción (`curl` + `grep` del chunk que arma el cliente de Supabase)
   contra `supabase projects api-keys --project-ref <ref>` (de solo lectura,
   no requiere `supabase link`). Arreglo: actualizar la env var en Vercel +
   redeploy (`gh workflow run deploy.yml --ref main`, ya que `NEXT_PUBLIC_*`
   se hornea en build time — cambiar la env var sola no alcanza).
6. **El job `test` de `ci.yml` se quedó fuera del arreglo del bug 3 — venía
   fallando en `supabase start` desde el 13 sept, sin que nadie lo notara.**
   El fix de `SEND_EMAIL_HOOK_SECRET_DEV`/`_PROD` en el `env:` de cada job
   (bug 3) solo tocó `deploy.yml`; `ci.yml` nunca recibió su propio secret,
   así que el job `test` fallaba en el primer paso (`supabase start`) con el
   mismo "Invalid hook config" — antes de llegar siquiera a `npm test`. Y
   arreglarlo con un secret real no bastaba: este runner no tiene
   `supabase/functions/.env` (gitignored) con credenciales reales de Brevo,
   y Auth corta el flujo completo si el hook falla (no solo el email) — con
   un secret con formato válido pero sin Brevo real detrás, `signUp`/
   `resetPasswordForEmail` se habrían roto para cualquier test, no solo
   `supabase start`. Se decidió con el usuario (16 sept 2026) **no** mandar
   emails reales por Brevo en cada corrida de CI (riesgo de bounces contra
   la reputación del remitente compartido con producción, direcciones
   `@ensoleil-test.com` que no existen) — en vez de eso, `ci.yml` desactiva
   el hook (`enabled = false`) solo en la copia efímera del checkout del
   runner, vía un `awk` que reescribe `supabase/config.toml` antes de
   `supabase start` (nunca toca el archivo real del repo). Con el hook
   desactivado, Auth cae de vuelta a su SMTP simulado (Mailpit) — que es
   justo lo que `forgot-password/page.test.tsx` ya esperaba encontrar en
   `MAILPIT_URL`. Verificado en local: se aplicó el mismo parche a mano,
   `supabase stop && supabase start`, y los 3 tests de `forgot-password` +
   los de `signup`/`login` pasaron igual. Nota: con el hook real activo
   (local dev normal, staging, prod), ese mismo test seguiría fallando
   porque el correo ya no llega a Mailpit — ver `docs/PENDIENTES.md`.

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

### Primer deploy real de punta a punta (11-12 sept 2026): 3 bugs reales, uno tapando al otro

Al probar el release a Vercel con un push real, `migrate-dev` falló en tres
puntos distintos y **secuenciales** — cada fix dejaba ver el siguiente bug,
que ya estaba ahí pero era invisible porque el pipeline nunca llegaba tan
lejos:

- [x] **Credenciales de Supabase equivocadas.** `supabase link` fallaba con
      `Authorization failed for the access token and project ref pair:
      "Your account does not have the necessary privileges..."`. El
      `SUPABASE_ACCESS_TOKEN` guardado en GitHub Secrets pertenecía a una
      cuenta/organización sin relación con LuxePass (confirmado conectando
      el MCP de Supabase: la sesión mostraba una organización ajena,
      "Audio Docent", ninguna traza de `luxepass-dev`/`luxepass-prod`). Este
      mismo token había migrado correctamente `luxepass-dev` y
      `luxepass-prod` el 8-9 sept — dejó de tener privilegios en algún
      punto entre el 9 y el 10 (revocado o regenerado, no hay forma de
      confirmar la causa exacta sin el log de auditoría de la cuenta).
      Arreglado generando un token nuevo desde la organización correcta
      (`LuxePass Training`, confirmada vía MCP) y actualizando el secret.
      `SUPABASE_DEV_PROJECT_REF`/`SUPABASE_PROD_PROJECT_REF` también se
      sobreescribieron con los refs confirmados por el MCP
      (`ymquzqwlmgylggjhepif`/`qtidqvduqtacdhuehjmq`) para descartar esa
      variable — GitHub no permite leer el valor previo de un secret, solo
      sobrescribirlo, así que no se pudo aislar si el ref ya estaba bien.
- [x] **`distDir` custom rompía `vercel build`.** Con las credenciales ya
      resueltas, el pipeline avanzó y falló en "Construir el proyecto":
      `Error: The Next.js output directory ".next" was not found`.
      `next.config.ts` fuerza `distDir: ".next-build"` cuando
      `NODE_ENV === "production"` (para que un build local no invalide el
      dev server, ver `CLAUDE.md`) — pero `vercel build` también corre con
      `NODE_ENV=production`, así que heredaba ese mismo `distDir`, y el
      builder de Vercel siempre espera el resultado en `.next` sin importar
      el `distDir` configurado. Arreglado detectando `VERCEL=1` (variable
      que Vercel setea automáticamente en su propio entorno de build) para
      volver al default ahí — el comportamiento local no cambia. PR #7.
- [x] **Next.js con vulnerabilidades críticas.** Con el build ya generando
      `.next`, el pipeline llegó a `vercel deploy` y Vercel lo bloqueó:
      `Error: Vulnerable version of Next.js detected, please update
      immediately`. `npm audit` confirmó que `next@15.1.0` tenía 3
      vulnerabilidades **críticas** (path traversal, deserialización
      insegura, bypass de autorización en middleware) más varias
      altas/moderadas (DoS, cache poisoning, SSRF). Arreglado con bump a
      `next@15.5.25` (última estable en la misma major que resuelve todo lo
      reportado para el paquete directo — queda un moderado transitivo vía
      `postcss` que solo se arregla saltando a Next 16, fuera de alcance).
      Verificado: `tsc`, `lint`, 586/586 tests y `build` en verde antes de
      mergear. PR #8.

Con los 3 arreglados, el run de `migrate-dev` completó todos sus pasos
(`supabase link` → `db push` → advisors → `vercel build` → `vercel deploy`)
sin intervención manual. **La Fase 8 (release a Vercel) queda confirmada de
punta a punta en dev**, pendiente de repetir la confirmación en prod cuando
se promueva `staging` → `main`.

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
