# Auditoría — Base de datos (Postgres / Supabase)

Fecha: 2026-10-12 · Alcance: Supabase **local** (`supabase status` → API `http://127.0.0.1:54331`, `linked_project: null`), contenedor `supabase_db_Luxe_Pass`. Solo lectura: consultas a catálogos, `EXPLAIN` (sin `ANALYZE`), `supabase db advisors --local`, `supabase migration list --local`. Sin cambios de schema, sin `db reset`, sin `migration up`, sin `npm test`, sin comandos remotos.

Ya cubierto en otras auditorías (se cita, no se repite): RLS/grants/`SECURITY DEFINER` → `seguridad-y-datos.md` (SEC-01..SEC-11); concurrencia de cupo → PAY-10; idempotencia de webhook/Stripe → SEC-04, PAY-11; unicidad miembro/franja → PAY-14; borrado en cascada de datos financieros → PRIV-02 (`privacidad-y-datos-personales.md`).

## Resumen

| ID | Severidad | Título |
|---|---|---|
| DB-01 | **Alta** | `bookings` no está en la publicación `supabase_realtime`: la suscripción del Today Dashboard de partner nunca recibe eventos |
| DB-02 | Media | FKs y filtros calientes sin índice: `bookings.member_id`, `payments.member_id`, `payments.booking_id`, `notifications.member_id`, `support_tickets.member_id` (17 FKs sin índice en total) |
| DB-03 | Media | `payments.booking_id` sin índice consultado en subconsultas `EXISTS` por fila (analytics, guest list, cupo mensual) |
| DB-04 | Media | Fallos de pg_net invisibles: 21 % de las llamadas de cron/webhooks fallan (500/503/timeout) y nada lo vigila; `net._http_response` y `cron.job_run_details` sin purga |
| DB-05 | Baja | Policies con `has_role()` sin envolver en `(select …)` y `has_role` usa `auth.uid()` sin envolver: evaluación por fila |
| DB-06 | Baja | Dos warnings de `multiple_permissive_policies` (`partners`, `partner_members` SELECT) |
| DB-07 | Baja | Consultas de dashboards admin por rango de fecha sobre `bookings`/`profiles` sin índice de `date`/`created_at` dedicado; casts `::date` impiden índices |
| DB-08 | Baja | Datos de seed (lounges) viven en migraciones y llegan a `luxepass-prod`; `supabase/seed.sql` no existe aunque `config.toml` lo referencia |
| DB-09 | Baja | Integridad: estados como `text + CHECK` coherentes, pero faltan unicidades/NOT NULL de negocio (p. ej. un solo ticket abierto por no-show, `bookings.cancellation_fee_cents` sin `CHECK >= 0`) |
| DB-10 | Info | Crons: sin solape real hoy (duración < 0,1 s); idempotencia por columnas `*_sent_at`; dependencia de 14 secretos de Vault que `db reset` borra |
| DB-11 | Info | Higiene de migraciones: 60 migraciones, todas aplicadas; schemas declarativos y BD sin deriva detectable a nivel de nombres |
| DB-12 | Info | Backups / PITR — **BLOQUEADO** (remoto) |

Controles positivos: dinero en `integer` (`amount_cents`, `refunded_amount_cents`, `cancellation_fee_cents`); todos los estados con `CHECK` de enumeración; `memberships` con PK `member_id` (una membresía por miembro garantizada); uniques en ids de Stripe; policies de miembro ya usan `(select auth.uid())`; sin índices duplicados en `public`; RLS en las 22 tablas (ver SEC).

---

## Hallazgos

### DB-01 — `bookings` fuera de la publicación de Realtime (Alta, Confirmado)

- **Ubicación:** `src/components/partner/today-dashboard.tsx:103-160` (`postgres_changes` INSERT/UPDATE sobre `public.bookings` filtrado por `lounge_id`); `supabase/schemas/bookings.sql:93-99` (comentario que asume que Realtime funciona).
- **Evidencia:** `select * from pg_publication_tables where pubname='supabase_realtime'` → 0 filas (la publicación existe pero está vacía). `grep -r "supabase_realtime\|publication" supabase/schemas supabase/migrations` → sin resultados. `bookings` con `REPLICA IDENTITY DEFAULT`.
- **Impacto:** el panel de hoy del partner no se actualiza en vivo con reservas nuevas, cancelaciones ni check-ins; el criterio de "tiempo real" de Epic 7 solo se cumple al recargar. La auditoría de frontend (`frontend-rendimiento-y-accesibilidad.md`) solo validó el cleanup del canal, no que reciba eventos. Si en los remotos se añadió a mano desde el Dashboard, es deriva no versionada.
- **Remediación:** en `supabase/schemas/bookings.sql` añadir `alter publication supabase_realtime add table public.bookings;` (y valorar `replica identity full` si el cliente necesita la fila vieja en UPDATE/DELETE), generar migración con el flujo declarativo. Comprobar en remotos con la misma query.
- **Cierre:** `pg_publication_tables` lista `public.bookings` en local, dev y prod; prueba manual: insertar reserva y verla aparecer sin recargar.

### DB-02 — FKs y columnas de filtro frecuentes sin índice (Media, Confirmado)

- **Ubicación:** `supabase/schemas/bookings.sql`, `payments.sql`, `notifications.sql`, `support_tickets.sql`, `lounge_closures.sql`, `admin_content.sql`, `partners.sql`.
- **Evidencia:** consulta a `pg_constraint`/`pg_index` → 17 FKs cuya primera columna no encabeza ningún índice: `bookings.member_id`, `payments.member_id`, `payments.booking_id`, `notifications.member_id`, `support_tickets.member_id/booking_id/assigned_admin_id`, `support_ticket_messages.ticket_id`, `lounge_closures.lounge_id`, `member_favorite_lounges.lounge_id`, `lounge_content_submissions.lounge_id/submitted_by`, `lounges.created_by`, `partners.created_by/representative_id`, `partner_members.selected_lounge_id`, `scheduled_reports.created_by`. Con `enable_seqscan=off`, `EXPLAIN select * from bookings where member_id=…` / `payments where member_id=…` / `notifications where member_id=… order by created_at desc limit 50` / `support_tickets where member_id=…` → `Seq Scan` (coste 1e10, no hay índice alternativo).
- **Impacto:** cada pantalla de miembro (mis reservas, pagos, notificaciones, `membership_visits_in_month`) y cada policy `(select auth.uid()) = member_id` recorre la tabla entera; crece lineal con el total de reservas/pagos de toda la red. Además, `ON DELETE CASCADE` desde `auth.users` (borrado de cuenta, `dispatch_account_deletions`) hace seq scan en cada tabla hija.
- **Remediación:** índices `bookings (member_id, date desc)`, `payments (member_id)`, `payments (booking_id) where status='succeeded'` o simple (ver DB-03), `notifications (member_id, created_at desc)`, `support_tickets (member_id)`, `support_ticket_messages (ticket_id)`, `lounge_closures (lounge_id, starts_on)`; el resto (FKs a `auth.users` de autoría) es opcional.
- **Cierre:** la query de FKs sin índice devuelve solo las aceptadas explícitamente; `EXPLAIN` de las consultas anteriores usa Index Scan con `enable_seqscan=off`.

### DB-03 — `EXISTS (payments where booking_id = b.id)` por fila sin índice (Media, Confirmado)

- **Ubicación:** `partner_analytics_summary`, `partner_guest_list`, `membership_visits_in_month`, `partner_bookings_by_day` (cuerpos en `pg_proc`; schemas `partner_analytics.sql`, `bookings.sql`, `memberships.sql`).
- **Evidencia:** las funciones filtran `exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')`; `EXPLAIN` de ese predicado → `Seq Scan on payments`. `partner_guest_list` además hace `select count(*) from bookings b2 where b2.member_id = b.member_id` por invitado (sin índice de `member_id`, DB-02). Hoy `payments.idx_scan = 0`.
- **Impacto:** O(reservas × pagos) en analytics de partner y dashboard admin (`admin_revenue_by_partner`). Con seed (13 reservas / 21 pagos) es invisible; con miles de reservas/mes las RPC de analytics y la guest list degradan a segundos.
- **Remediación:** índice `payments (booking_id) include (status)` o parcial `where status='succeeded'`; índice `bookings (member_id)`.
- **Cierre:** `EXPLAIN` de `partner_analytics_summary` con datos sintéticos (≥10k reservas en una rama local) muestra Index/Hash join sobre `payments`, sin seq scan anidado.

### DB-04 — Fallos de pg_net sin visibilidad y tablas de log sin purga (Media, Confirmado)

- **Ubicación:** `dispatch_*` (crons) y triggers `notify_*` → `net.http_post`; `cron.job_run_details`, `net._http_response`.
- **Evidencia:** `net._http_response`: 2.616 filas en ~6 h; 2.064 × 200, **363 × 500, 35 × 503, 115 "Server returned nothing", 5 timeouts de 15 s** (≈21 % fallos). `cron.job_run_details`: 673 filas, todas `succeeded` — el cron marca éxito porque `net.http_post` es asíncrono y el fallo HTTP queda solo en `_http_response`. No hay job que purgue `cron.job_run_details` (pg_net purga `_http_response` por TTL propio, 6 h por defecto). Los dispatchers marcan `reminder_sent_at`/`morning_notification_sent_at` **en la misma transacción que encolan la petición**, antes de saber si la Edge Function respondió 200.
- **Impacto:** un recordatorio, digest o renovación (`dispatch_membership_renewals`, ver PAY-02/PAY-09) que falla en la Edge Function queda marcado como enviado y no se reintenta; nadie se entera. En local los 500 pueden ser ruido (funciones no servidas), pero en remoto el mecanismo es el mismo. `job_run_details` crece sin límite (≈ 200 filas/h con 3 jobs cada 15–30 min).
- **Remediación:** que la Edge Function marque `*_sent_at` (o una tabla de outbox con estado) tras el envío correcto, o reconciliar leyendo `net._http_response`; alerta (log drain / job que cuente códigos ≥ 400 en la última hora); job semanal `delete from cron.job_run_details where end_time < now() - interval '7 days'`.
- **Cierre:** un fallo 500 provocado deja la reserva sin `reminder_sent_at` y se reintenta en la siguiente corrida; existe job de purga; existe alerta documentada en `docs/ci-cd/`.

### DB-05 — `has_role()` evaluado por fila en policies (Baja, Confirmado)

- **Ubicación:** `supabase/schemas/user_roles.sql:39` (`has_role`: `where user_id = auth.uid() and role = p_role`, `STABLE`, `SECURITY INVOKER`); policies `has_role('admin')` en `lounges`, `lounge_closures`, `lounge_seasons`, `lounge_content_submissions`, `partners`, `partner_members`, `scheduled_reports`, `support_tickets`, `support_ticket_messages`, `storage.objects`.
- **Evidencia:** `pg_policies.qual` muestra `has_role('admin'::text)` sin `(select …)`; `user_roles` tiene `seq_scan = 18.854`, `idx_scan = 0` en `pg_stat_user_tables` (el planner usa seq por tamaño, pero la llamada se repite). La policy de `lounges` además hace un `EXISTS` sobre `bookings` por fila.
- **Impacto:** con tablas pequeñas es despreciable; en `storage.objects` y `lounges` el coste escala por fila leída. Regla `security-rls-performance` del skill de best practices.
- **Remediación:** `(select public.has_role('admin'))` en las policies y `(select auth.uid())` dentro de `has_role`.
- **Cierre:** `pg_policies` sin llamadas a `has_role(` fuera de `(SELECT …)`.

### DB-06 — Múltiples policies permisivas (Baja, Confirmado)

- **Evidencia:** `supabase db advisors --local` → 2 WARN `multiple_permissive_policies`: `public.partners` (SELECT: `admins read partners`, `members read own partner`, `read partner of a live lounge`) y `public.partner_members` (SELECT: `admins read partner members`, `read own partner membership`).
- **Impacto:** cada SELECT evalúa todas las policies (OR). Menor; `bookings.sql` ya documenta el patrón de fusionar en una sola.
- **Remediación:** fusionar en una policy por tabla con `or`, o pasar la de admin a un rol/ruta RPC.
- **Cierre:** `supabase db advisors --local` sin warnings.

### DB-07 — Rangos de fecha sin índice adecuado en dashboards admin (Baja, Confirmado)

- **Ubicación:** `admin_network_summary`, `admin_bookings_by_day`, `admin_city_demand`, `admin_export_*`.
- **Evidencia:** `where b.date between p_from and p_to` solo puede usar `bookings_lounge_date_band_idx` como full index scan (no es columna líder); `profiles where p.created_at::date between …` y `deleted_at::date` — el cast anula cualquier índice. `admin_network_summary` hace 7 escaneos separados de las mismas tablas.
- **Impacto:** escala lineal con la historia total; aceptable hoy, notable con años de datos.
- **Remediación:** índice `bookings (date)`; comparar `created_at >= p_from and created_at < p_to + 1` en lugar de `::date`; un solo `select … count(*) filter (…)` por tabla.
- **Cierre:** `EXPLAIN` con `enable_seqscan=off` muestra Index Scan por `date`.

### DB-08 — Seed en migraciones; `seed.sql` inexistente (Baja, Confirmado)

- **Evidencia:** `supabase/config.toml:70` `sql_paths = ["./seed.sql"]`, pero `supabase/seed.sql` no existe ni está en git. Los lounges de muestra se insertan en `supabase/migrations/20260913162106_seed_lounges_story_2_1.sql` (y `…_admin_add_lounge.sql`, `…_created_by_admin.sql`). `CLAUDE.md` menciona "datos del seed".
- **Impacto:** `deploy.yml` aplica esas migraciones a `luxepass-prod`: los 18 lounges de muestra aparecen en producción. Documentación y config apuntan a un archivo que no existe.
- **Remediación:** decidir si los lounges de muestra son contenido real; si no, moverlos a `seed.sql` (solo local) y retirarlos de prod con migración; actualizar `config.toml`/`CLAUDE.md`.
- **Cierre:** decisión anotada en `docs/PENDIENTES.md`; `seed.sql` existe o la ruta se elimina de `config.toml`.

### DB-09 — Huecos de integridad menores (Baja, Confirmado)

- **Evidencia (catálogo `pg_constraint`):** todos los `status` tienen `CHECK` de enumeración (bookings, payments, memberships, partners, referrals, support_tickets, submissions). Faltan: `bookings.cancellation_fee_cents` sin `CHECK >= 0`; `payments.refunded_amount_cents` sin `CHECK <= amount_cents`; sin unicidad de reserva activa por miembro/lounge/fecha/franja (ya PAY-14); `payments.booking_id ON DELETE SET NULL` y `support_tickets.booking_id SET NULL` (huérfanos aceptables); `support_tickets.assigned_admin_id`/`scheduled_reports.created_by`/`lounge_content_submissions.submitted_by` `NO ACTION` → borrar un admin de `auth.users` falla si tiene tickets o informes (efecto lateral en `dispatch_account_deletions` si se aplica a admins). Cascadas `auth.users → payments`: PRIV-02.
- **Remediación:** añadir los `CHECK` de importes; decidir `SET NULL` para FKs de autoría admin.
- **Cierre:** constraints presentes en `supabase/schemas/*.sql`.

### DB-10 — pg_cron: calendario, solape, idempotencia, Vault (Info, Confirmado)

- **Evidencia:** 6 jobs (`cron.job`): `send-booking-reminders` `*/30`, `send-morning-notifications` `*/15`, `dispatch-scheduled-reports` `*/15`, `dispatch-account-deletions` `0 7`, `send-partner-morning-digest` `30 6`, `dispatch-membership-renewals` `0 9`. Duración máxima < 0,09 s → sin solape real; `cron.max_running_jobs = 32`. Idempotencia por `reminder_sent_at`/`morning_notification_sent_at` (+ ventana horaria), pero ver DB-04 (se marca antes del éxito). Secretos: 14 entradas en `vault.secrets` (`*_webhook_url`/`*_secret`), alineadas con `docs/ci-cd/VAULT-SECRETS.md`; un remoto sin ellos hace que los dispatchers no envíen nada sin error visible. Los crons usan `now()` real (por diseño, CLAUDE.md). `dispatch_morning_notifications` usa la ventana 05:45–06:15 **UTC**, no la zona del lounge — Inferido como desviación funcional.
- **Remediación:** check de arranque que falle ruidosamente si falta un secreto; revisar zona horaria del aviso matinal.

### DB-11 — Higiene de migraciones (Info, Confirmado / parcialmente BLOQUEADO)

- **Evidencia:** 60 migraciones en `supabase/migrations/`, todas aplicadas (`supabase migration list --local`: local = remote en las 60). 28 archivos en `supabase/schemas/`; las 22 tablas y los 112 nombres de función de `public` coinciden exactamente entre schemas y BD (diff de nombres vacío). Diff completo de definiciones **BLOQUEADO**: requiere `supabase db schema declarative sync --no-apply`, que escribe archivo (prohibido en esta auditoría). Avisos: CLI v2.116 (hay v2.120). Las RPC de Epic 10 viven en esta rama hasta `20261002…`; si staging ya tiene migraciones posteriores, este checkout está desfasado (no verificado).
- **Remediación:** en CI, correr `declarative sync --no-apply` en un runner y fallar si genera archivo no vacío.

### DB-12 — Backups / PITR (Info, BLOQUEADO)

No verificable sin acceso a los proyectos remotos `luxepass-dev`/`luxepass-prod` (plan, backups diarios, PITR, pruebas de restauración). Pendiente de revisar en el Dashboard de Supabase y documentar en `docs/ci-cd/RESUMEN.md`.

## N+1 desde el cliente

`grep` en `src/lib` y `src/components`: los accesos múltiples usan `Promise.all` con consultas distintas (no bucles). Excepción: `src/components/admin/partner-bulk-dialogs.tsx:289` y `:394` hacen una RPC por lounge seleccionado (`listLoungeSchedule`, `closureBookings`) — N+1 acotado al número de lounges de un partner (Baja, sin ID propio; agrupar en una RPC con `text[]` si los partners crecen).

## Checks ejecutados

- `supabase status` (API 127.0.0.1:54331, sin proyecto enlazado).
- Catálogos: `pg_constraint`, `pg_index`/`pg_indexes`, `pg_policies`, `pg_proc` (`provolatile`, `prosecdef`, `prosrc`), `pg_stat_user_tables`, `pg_publication_tables`, `pg_class.relreplident`, `information_schema.columns`.
- `cron.job`, `cron.job_run_details`, `net._http_response`, `vault.secrets` (solo nombres), `realtime.messages`.
- `EXPLAIN` (sin `ANALYZE`, `enable_seqscan=off`) sobre filtros por `member_id`, `booking_id`, rango de `date`.
- `supabase db advisors --local`, `supabase migration list --local`.
