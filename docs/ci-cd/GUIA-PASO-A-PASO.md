# CI/CD para LuxePass — Guía paso a paso

> Lee primero `RESUMEN.md` en esta misma carpeta si no tienes el contexto
> fresco. Este documento es la receta de ejecución, en orden. Cada paso dice
> quién lo hace: **[Tú]** significa que requiere una cuenta, un click en una
> web, o un dato que solo tú tienes (tarjeta, email, permisos de la
> organización). **[Yo]** significa que lo hago con las herramientas que
> tengo (editar archivos, git, correr comandos que no piden credenciales
> tuyas).

Ve tachando las casillas conforme avances. Si cierras la sesión de Claude
Code a la mitad, la próxima vez solo di "sigamos con la guía de CI/CD" — con
`RESUMEN.md` y las casillas marcadas aquí alcanza para retomar sin repetir
esta conversación.

---

## Fase 0 — Antes de empezar

- [ ] **[Tú]** Confirmar: ¿el PR de `staging` → `main` lo abres tú a mano
      cuando decidas hacer un release, o quieres que se abra solo? (ver
      "Decisiones que faltan" en `RESUMEN.md`). Si no estás seguro, empezamos
      con manual — es más fácil de deshacer que lo automático.
- [ ] **[Tú]** Confirmar que tienes (o puedes crear) una tarjeta/cuenta de
      pago para Supabase y Vercel — ambos tienen planes gratuitos que
      alcanzan para dev, pero el proyecto de producción puede necesitar un
      plan pago según el tráfico esperado. Esto no lo decido yo por ti.

---

## Fase 1 — Cuenta y proyectos de Supabase (remotos)

Ya usas Supabase en local (Docker) para desarrollo — ver `CLAUDE.md`
§"Supabase Local Development". Ahora hace falta la versión **remota**, hosteada
por Supabase, para que Vercel pueda leer datos reales.

- [ ] **[Tú]** Si no tienes cuenta, créala en supabase.com (puede ser con el
      email que ya usas para GitHub, para que quede todo bajo la misma
      organización).
- [ ] **[Tú]** Crea un proyecto llamado algo como `luxepass-dev`. Anota:
      - **Project ref** (aparece en la URL del proyecto y en Settings →
        General, algo como `abcdefghijklmnop`)
      - **Database password** (la pides al crear el proyecto — Supabase la
        genera o la eliges tú)
      - **Project URL** y **anon key** (Settings → API)
- [ ] **[Tú]** Repite lo mismo para un segundo proyecto, `luxepass-prod`.
      Anota los mismos 4 datos para este.
- [ ] **[Tú]** Genera un **Personal Access Token** de Supabase (Account →
      Access Tokens, no es lo mismo que la anon key) — este token es el que
      usará GitHub Actions para autenticarse contra la plataforma de
      Supabase, no contra una base específica.

Con esto tienes 2 × (project ref, DB password, project URL, anon key) + 1
access token. Pásamelos cuando lleguemos a la Fase 6 (como GitHub Secrets,
nunca pegados en el chat ni en un archivo del repo).

---

## Fase 2 — Primera migración a los proyectos remotos

Esto lo hacemos juntos, una sola vez, para que ambos proyectos remotos
arranquen con el mismo schema que ya tienes probado en local.

- [ ] **[Yo]** Reviso qué hay hoy en `supabase/schemas/` y
      `supabase/migrations/` en la rama `chore/ci-cd-pipeline-setup`.
- [ ] **[Tú]** Me das el project ref y la contraseña de `luxepass-dev` (por
      variable de entorno en tu terminal, no escritos en el chat — te digo
      cómo cuando lleguemos aquí).
- [ ] **[Yo]** Corro `supabase link --project-ref <ref-dev>` y
      `supabase db push` (sin `--local`) contra `luxepass-dev`, con tu
      autorización explícita en el momento — esto es la única vez que se
      enlaza un proyecto remoto desde esta sesión de desarrollo, y es
      deliberado.
- [ ] Repetimos lo mismo contra `luxepass-prod`.
- [ ] **[Yo]** Corro `supabase db advisors` contra ambos y reviso warnings de
      seguridad antes de seguir.

---

## Fase 3 — Cuenta y proyectos de Vercel

- [ ] **[Tú]** Si no tienes cuenta, créala en vercel.com — mejor con "Continue
      with GitHub" para que quede conectada a tu cuenta de GitHub
      directamente.
- [ ] **[Tú]** "Add New… → Project" → importa el repo `luxe-pass-training`.
      En la configuración inicial, dale un nombre como `luxepass-prod` y deja
      que trackee `main`.
- [ ] **[Tú]** Repite "Add New… → Project" **con el mismo repo otra vez**
      (Vercel permite importarlo más de una vez como proyectos distintos).
      Nómbralo `luxepass-dev`. En Settings → Git de este segundo proyecto,
      cambia la "Production Branch" de `main` a `staging`.
- [ ] **[Tú]** En cada proyecto → Settings → Environment Variables, añade las
      variables que ya tienes en tu `.env.local` (las `NEXT_PUBLIC_SUPABASE_*`
      y las que use el proyecto), pero apuntando al Supabase remoto
      correspondiente: `luxepass-dev` usa las credenciales de
      `luxepass-dev`, `luxepass-prod` usa las de `luxepass-prod`. Nunca
      cruzar los dos.
- [ ] **[Tú]** En cada proyecto → Settings → Git, busca la opción de
      desactivar el deploy automático en push (o lo dejamos activo pero sin
      usarlo — ver nota en Fase 5). Anótame cuál prefieres cuando lleguemos
      ahí.

---

## Fase 4 — Tokens de Vercel

- [ ] **[Tú]** Genera un token en vercel.com/account/tokens (scope: el equipo/
      cuenta donde están los 2 proyectos).
- [ ] **[Tú]** Anota el **Org ID** (Team/Account Settings → General) y el
      **Project ID** de cada uno de los 2 proyectos (Project → Settings →
      General).

---

## Fase 5 — GitHub Secrets

- [ ] **[Tú]** En GitHub → repo → Settings → Secrets and variables → Actions,
      crea estos secrets (los valores me los das a mí solo si vamos a
      correr algo juntos desde esta sesión; para los workflows de CI no hace
      falta que yo los vea, tú los pegas directo en GitHub):

  | Secret | De dónde sale |
  |---|---|
  | `SUPABASE_ACCESS_TOKEN` | Fase 1, Personal Access Token |
  | `SUPABASE_DEV_PROJECT_REF` | Fase 1, project ref de `luxepass-dev` |
  | `SUPABASE_DEV_DB_PASSWORD` | Fase 1, password de `luxepass-dev` |
  | `SUPABASE_PROD_PROJECT_REF` | Fase 1, project ref de `luxepass-prod` |
  | `SUPABASE_PROD_DB_PASSWORD` | Fase 1, password de `luxepass-prod` |
  | `VERCEL_TOKEN` | Fase 4 |
  | `VERCEL_ORG_ID` | Fase 4 |
  | `VERCEL_PROJECT_ID_DEV` | Fase 4, proyecto `luxepass-dev` |
  | `VERCEL_PROJECT_ID_PROD` | Fase 4, proyecto `luxepass-prod` |

- [ ] **[Yo]** Cuando confirmes que están todos creados (sin que necesite ver
      los valores), escribo los workflows que los referencian por nombre.

---

## Fase 6 — Los workflows de GitHub Actions

- [ ] **[Yo]** Escribo `.github/workflows/ci.yml`: corre lint, `tsc --noEmit`,
      `npm test`, `npm run build` en cada PR hacia `staging` y hacia `main`.
- [ ] **[Yo]** Escribo `.github/workflows/deploy.yml`: en push a `staging`
      aplica migraciones a `luxepass-dev` y hace `vercel deploy --prod` sobre
      el proyecto `luxepass-dev`; en push a `main` hace lo mismo contra
      `luxepass-prod`.
- [ ] **[Yo]** Los pruebo empujando un commit trivial a
      `chore/ci-cd-pipeline-setup` y revisando la pestaña Actions de GitHub.

---

## Fase 7 — Protección de ramas y auto-merge

- [ ] **[Tú]** En GitHub → Settings → Branches, añade una regla para `main` y
      otra para `staging`: exigir que el check de `ci.yml` pase antes de
      poder mergear, y prohibir el force-push.
- [ ] **[Tú]** Habilita "Allow auto-merge" en la configuración general del
      repo (Settings → General → Pull Requests).
- [ ] Cuando abras el PR `staging` → `main`, usa el botón "Enable auto-merge"
      de GitHub (o te ayudo con `gh pr merge --auto --squash` si prefieres
      hacerlo desde la terminal).

---

## Fase 8 — Prueba de punta a punta

- [ ] Hacer un cambio pequeño en `chore/ci-cd-pipeline-setup`, abrir PR hacia
      `staging`, confirmar que `ci.yml` corre y bloquea el merge si falla.
- [ ] Mergear a `staging`, confirmar que `deploy.yml` migra `luxepass-dev` y
      publica en el Vercel de dev.
- [ ] Abrir PR `staging` → `main`, confirmar que corre la misma batería y que
      el auto-merge funciona.
- [ ] Confirmar que el release a `luxepass-prod` se disparó correctamente tras
      el merge a `main`.

---

## Fase 9 — Actualizar `CLAUDE.md`

- [ ] **[Yo]** Reescribo §"Alcance: esto es SOLO frontend" para reflejar que
      ya hay backend real (ver `docs/ci-cd/RESUMEN.md` §"Por qué esto existe
      ahora").
- [ ] **[Yo]** Añado a §"Supabase Local Development" la excepción de CI:
      GitHub Actions sí enlaza proyectos remotos, con tokens en GitHub
      Secrets — nunca un desarrollador en su máquina.
- [ ] **[Yo]** Documento las 2 ramas (`main`, `staging`) y los 2 pares de
      proyectos (Supabase, Vercel) en la sección de ramas del `CLAUDE.md`.

---

## Notas de seguridad

- Ningún token, password o key de Supabase/Vercel se pega en el chat de
  Claude Code ni se comitea al repo. Van solo en GitHub Secrets y en las
  Environment Variables de cada proyecto de Vercel.
- El `.gitignore` ya excluye `.env.local`. Revisa que el archivo suelto
  `env.local` (sin el punto inicial) que apareció en el repo no tenga
  credenciales reales antes de tocarlo — no está en `.gitignore` por ese
  nombre exacto.
