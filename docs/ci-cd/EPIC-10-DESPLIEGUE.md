# Epic 10 — Ajustes para llevarlo a `staging` y `main`

Checklist de lo que hay que hacer **en los proyectos remotos de Supabase**
(`luxepass-dev` para `staging`, `luxepass-prod` para `main`) cuando la rama
`refactor/partners-lounges-structure` salga de local. En local ya está todo
hecho. Lo de Vercel queda fuera de este documento, para más adelante.

Recordatorio de reglas del proyecto (CLAUDE.md):

- Nadie enlaza (`supabase link`) un proyecto remoto a mano: las migraciones
  las aplica el CI al hacer merge (`.github/workflows/deploy.yml`). Lo que
  este documento pide hacer "a mano" se hace desde el **Dashboard de
  Supabase** (SQL Editor, Auth, Edge Functions) o con comandos que reciben
  `--project-ref` sin enlazar.
- Nunca `git push` directo a `staging` ni a `main`: todo entra por PR.
- Todo lo que toque `luxepass-prod` necesita confirmación explícita del
  cliente antes de ejecutarse.

---

## Resumen

| # | Qué | Dónde | Cuándo | Bloquea el deploy |
|---|---|---|---|---|
| 1 | Vaciar los partners antiguos | SQL Editor del remoto | **Antes** del merge | **Sí**: la migración falla con filas |
| 2 | Quitar las cuentas de partner antiguas | Auth / SQL Editor | Antes del merge | No, pero quedan cuentas huérfanas |
| 3 | Merge del PR | GitHub | — | — |
| 4 | Comprobar la migración | SQL Editor | Justo después | — |
| 5 | Borrar las Edge Functions retiradas | Dashboard o CLI con `--project-ref` | Después del merge | No |
| 6 | Revisar secretos de `admin-partners` | Dashboard → Edge Functions → Secrets | Después del merge | No (ya deberían estar) |
| 7 | Caducidad de 24 h de las invitaciones | Dashboard → Auth | Una vez por proyecto | No |
| 8 | Cargar partners reales y asignar lounges | `/admin/partners` y `/admin/lounges` | Después del deploy | No |
| 9 | Emails al partner | Pendiente del Epic 7 | Cuando se despliegue | No |

Hacer los pasos 1–8 primero en `luxepass-dev` (PR a `staging`). Solo cuando
`staging` esté validado, repetirlos en `luxepass-prod` (PR `staging` → `main`).

---

## 1. Vaciar los partners antiguos (antes del merge)

La migración `20261001194915_partner_organizations.sql`:

- añade `partners.name text not null` **sin default**: si `partners` tiene
  alguna fila, falla el `supabase db push` del CI y el deploy se detiene;
- borra `partner_lounges` y `lounge_partner_invites` (los vínculos
  persona → lounge del modelo viejo se pierden igualmente).

El modelo nuevo empieza de cero (decisión del 1 oct 2026), así que se vacía
antes. En el **SQL Editor** del proyecto remoto:

```sql
-- 1) Ver qué hay (anotar los números antes de borrar)
select
  (select count(*) from public.partners)               as partners,
  (select count(*) from public.partner_lounges)        as partner_lounges,
  (select count(*) from public.lounge_partner_invites) as invites;

-- 2) Vaciar, en este orden
delete from public.lounge_partner_invites;
delete from public.partner_lounges;
delete from public.partners;
```

> En `luxepass-prod`: confirmar con el cliente antes del paso 2. Si hay
> partners reales trabajando, avisarles de que su cuenta se recreará desde el
> admin nuevo (pasos 8 y 7).

## 2. Quitar las cuentas de partner antiguas

Vaciar `partners` no borra los usuarios de Auth ni su rol. Sin limpiar,
quedarían cuentas con `user_roles.role = 'partner'` que entran a `/partner`
y ven el dashboard vacío. En el SQL Editor:

```sql
-- Las cuentas con rol partner (revisar la lista antes de borrar nada)
select u.id, u.email, u.created_at
from public.user_roles r
join auth.users u on u.id = r.user_id
where r.role = 'partner'
order by u.created_at;
```

Borrarlas desde **Authentication → Users** (botón *Delete user*). Borrar el
usuario de Auth se lleva su fila de `user_roles` en cascada. Si alguna
persona va a seguir siendo partner con el **mismo email**, **hay que
borrarla igual**: el modelo nuevo exige que el usuario partner sea una
cuenta nueva (un email que ya existe se rechaza con "already in use").

## 3. Merge del PR

1. PR de la rama `refactor/partners-lounges-structure` → `staging`, con el CI
   en verde.
2. Al hacer merge, `deploy.yml` aplica las 17 migraciones del Epic 10 a
   `luxepass-dev`:

   ```
   20261001194915_partner_organizations.sql
   20261001201334_admin_partner_list.sql
   20261001202207_admin_partner_crud.sql
   20261001202559_admin_create_partner_users.sql
   20261001203321_partner_suspension.sql
   20261001203530_partner_detail_order.sql
   20261001203752_partner_detail_suspension.sql
   20261001205214_lounge_partner_admin.sql
   20261001211323_partner_lounge_switcher.sql
   20261001212707_partner_notification_recipients.sql
   20261001221331_partner_context_access.sql
   20261001222131_draft_keeps_existing_photos.sql
   20261002161224_created_by_admin.sql
   20261002163007_email_pause.sql
   20261002170623_partner_detail_lounge_address.sql
   20261002173839_lounge_seasons_and_closures.sql
   20261002173956_lounge_season_dates_message.sql
   ```

   y despliega la Edge Function nueva `admin-partners`.
3. Revisar en el log del job la salida de `supabase db advisors --linked`
   (no bloquea, pero hay que mirarla).

## 4. Comprobar la migración

En el SQL Editor, justo después del deploy:

```sql
-- Las tablas nuevas existen y las viejas no
select to_regclass('public.partner_members')        as partner_members,     -- no null
       to_regclass('public.partner_lounges')        as partner_lounges,     -- null
       to_regclass('public.lounge_partner_invites') as invites;             -- null

-- Columnas nuevas de lounges
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'lounges'
  and column_name in ('partner_id', 'suspended_by');                       -- 2 filas

-- Ningún lounge quedó con un estado raro
select content_status, count(*) from public.lounges group by 1;
```

Y en la app de `staging`: entrar como admin, abrir **Partners** (lista vacía)
y **Lounges** (columna Partner con "No partner yet").

## 5. Borrar las Edge Functions retiradas

`admin-publish-lounge` y `admin-lounge-partners` ya no existen en el repo ni
en `deploy.yml`, pero si se desplegaron antes siguen vivas en el remoto
(sin nadie que las llame, y apuntando a tablas que ya no existen).

- **Dashboard:** *Edge Functions* → cada una → *Delete function*.
- **O CLI, sin enlazar:**

  ```bash
  supabase functions delete admin-publish-lounge --project-ref <ref-del-proyecto>
  supabase functions delete admin-lounge-partners --project-ref <ref-del-proyecto>
  ```

  Los refs no viven en el repo: están en los GitHub Secrets / en la memoria
  de entornos (ver `docs/ci-cd/RESUMEN.md`).

## 6. Secretos de `admin-partners`

`admin-partners` envía la invitación de crear contraseña por Brevo y arma el
enlace con `APP_URL`. Los secretos de Edge Functions son **del proyecto**, no
de cada función, y `deploy.yml` ya los fija para `send-email`:

`APP_URL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`

Solo hay que **comprobar** en *Edge Functions → Secrets* que están, y que
`APP_URL` apunta a la URL de ese entorno (dev → staging, prod → producción):
el enlace del email es `${APP_URL}/partner/welcome?token_hash=…`.

## 7. Caducidad de 24 h de las invitaciones

El email de invitación promete un enlace de 24 h. En local vale porque
`supabase/config.toml` fija `otp_expiry = 86400`, pero **los remotos no leen
ese archivo**. En cada proyecto:

*Authentication → Providers → Email → Email OTP Expiration* = `86400`.

(Afecta también a los enlaces de confirmación y recuperación. Ver
`docs/PENDIENTES.md` §4.12.)

## 8. Cargar partners reales y asignar lounges

Con la app de ese entorno, como admin:

1. **Partners → Add partner**: nombre, email de contacto, edificio central y
   sus usuarios (el primero queda como representante). Se guarda en draft y
   **no envía nada**.
2. **Activate partner** cuando esté listo: cada usuario recibe el email de
   crear contraseña. Activar exige al menos un usuario.
3. **Asignar sus lounges.** Un lounge **live sin partner** sigue visible y
   reservable para los miembros, pero no notifica a nadie y su partner no lo
   ve en el dashboard. Para asignarle uno: *Lounges* → el lounge → *Edit
   lounge* (pasa a draft) → elegir el partner en **Partner** → *Publish
   lounge* (exige un partner activo).

   > Mientras está en draft sale del catálogo: hacerlo en un momento de poco
   > uso. Las reservas ya hechas siguen valiendo.

4. Comprobar: el partner ve sus lounges en `/partner` y puede cambiar entre
   ellos con el selector de la cabecera.

## 9. Emails al partner (pendiente heredado del Epic 7)

Los emails de reserva nueva, cancelación y resumen de la mañana salen de
`send-partner-booking-event` y `send-partner-digest`, que **todavía no se
despliegan** en `deploy.yml` ni tienen sus secretos de Vault en los remotos
(`docs/PENDIENTES.md` §4.6, `docs/ci-cd/VAULT-SECRETS.md`). El Epic 10 cambia
a quién llegan y lo que dicen, pero no eso: en remoto seguirán sin enviarse
hasta cerrar ese pendiente.

---

## Después, en producción

Repetir 1, 2 y 4–8 en `luxepass-prod`, con el PR `staging` → `main`.
Antes de empezar, el cliente tiene que confirmar:

- que se pueden borrar los partners y sus cuentas actuales (pasos 1–2);
- quiénes son los partners reales, con sus usuarios y qué lounges opera cada
  uno (paso 8).

## Fuera de este documento

- **Vercel** (variables de entorno de `staging`/`main`): para más adelante.
- `docs/PENDIENTES.md` §4.13 resume estos mismos puntos junto al resto de
  pendientes del Epic 10.
