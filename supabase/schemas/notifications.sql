-- Story 6.2 — In-app Notifications. Nace aquí, dueña Epic 6 (ver
-- docs/DATA-MODEL-MAP.md): anticipada como "referenciada por Epic 5
-- (reminder), Epic 7 (notificaciones a partners), Epic 9 (confirmación de
-- referido)" — ninguno de los tres acabó usándola: Story 5.3 se conectó con
-- pg_cron real ("decisión revertida"), y Epic 7 decidió lo mismo a
-- propósito al implementarse (22 sept 2026, ver
-- supabase/schemas/partner_notifications.sql) — el AC de Story 7.2 es
-- "recibir un email", no una fila en este centro de notificaciones del
-- miembro. Epic 9 sigue sin conectar.
--
-- De los seis tipos que pide el AC, solo dos tienen un evento real detrás en
-- este repo hoy — los otros cuatro (nuevo lounge partner, renovación de
-- membresía, ofertas, mes de cumpleaños) dependen de datos que Epic 7/9
-- todavía no modelan de verdad, así que se siembran como filas de muestra
-- reales (no sintéticas del cliente) la primera vez que se crea el perfil,
-- documentado como desviación consciente en docs/design/COMPONENT-MAP.md:
--   1. Booking confirmation      → trigger AFTER INSERT en `bookings` (real)
--   2. Aviso de las 6 AM         → pg_cron, mismo mecanismo que Story 5.3 (real)
--   3. Nuevo lounge partner      → sembrada al crear el perfil (muestra)
--   4. Renovación de membresía   → sembrada al crear el perfil (muestra)
--   5. Ofertas y promociones     → sembrada al crear el perfil (muestra)
--   6. Mes de cumpleaños         → sembrada al crear el perfil (muestra)
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references auth.users (id) on delete cascade,
  category   text not null check (category in ('bookings', 'lounges', 'offers', 'membership')),
  icon       text not null check (icon in ('morning', 'birthday', 'booking', 'lounge', 'membership', 'offer')),
  title      text not null,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "select own notifications"
on public.notifications for select
to authenticated
using ( (select auth.uid()) = member_id );

-- Solo para marcar como leída (`read_at`) — nunca se inserta directo desde
-- el cliente, siempre vía los triggers/cron de abajo (SECURITY DEFINER, que
-- bypasean RLS como dueños de la tabla, igual que `notify_booking_confirmed`
-- en `booking_receipts.sql`).
create policy "update own notifications"
on public.notifications for update
to authenticated
using ( (select auth.uid()) = member_id )
with check ( (select auth.uid()) = member_id );

/* -------------------------------------------------------------------- */
/* 1. Booking confirmation — evento real, AFTER INSERT en `bookings`     */
/* -------------------------------------------------------------------- */

create or replace function public.notify_booking_confirmed_in_app()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lounge_name text;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

  insert into public.notifications (member_id, category, icon, title, body)
  values (
    new.member_id,
    'bookings',
    'booking',
    'Booking confirmed · ' || new.confirmation_code,
    coalesce(v_lounge_name, 'Your lounge') || ', ' || to_char(new.date, 'FMDay, FMMonth FMDD') || ' at ' || new.slot_time
      || '. The pass is waiting in My Pass and the confirmation is in your email.'
  );

  return new;
end;
$$;

revoke execute on function public.notify_booking_confirmed_in_app() from public;

drop trigger if exists booking_confirmed_notify_in_app on public.bookings;

create trigger booking_confirmed_notify_in_app
  after insert on public.bookings
  for each row
  execute function public.notify_booking_confirmed_in_app();

/* -------------------------------------------------------------------- */
/* 2. Aviso de las 6 AM el día de la visita — pg_cron, evento real        */
/* -------------------------------------------------------------------- */

-- Ya habilitada por `booking_reminders.sql` (Story 5.3) — `if not exists` la
-- vuelve idempotente sin importar el orden de aplicación de los `schemas/*.sql`.
create extension if not exists pg_cron with schema extensions;

-- A diferencia de las RPC de recepción (`bookings.sql`), `now()` aquí SÍ es
-- el reloj real de Postgres a propósito — mismo criterio que
-- `dispatch_booking_reminders` (Story 5.3, `booking_reminders.sql`): "la
-- mañana de la visita" es un instante de verdad, no el "hoy" de mockup.
-- Mismo gap conocido que esa función: `lounge_availability` está sembrada en
-- una ventana fija de 18 semanas desde 2025-09-09, así que ninguna reserva
-- real posible hoy cae en el `current_date` real — el mecanismo es correcto
-- pero no se puede ejercitar de punta a punta en local/CI todavía (ver
-- docs/PENDIENTES.md).
create or replace function public.dispatch_morning_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
begin
  for v_booking in
    select b.*, l.name as lounge_name, l.address as lounge_address
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    where b.status = 'confirmed'
      and b.morning_notification_sent_at is null
      and b.date = (now() at time zone 'UTC')::date
      and (now() at time zone 'UTC')::time between time '05:45' and time '06:15'
  loop
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_booking.member_id,
      'bookings',
      'morning',
      'Your visit today at ' || v_booking.lounge_name,
      'Arrive at ' || v_booking.slot_time || ' · ' || v_booking.lounge_address
        || ' · your pass is ' || v_booking.confirmation_code || '.'
    );

    update public.bookings set morning_notification_sent_at = now() where id = v_booking.id;
  end loop;
end;
$$;

revoke execute on function public.dispatch_morning_notifications() from public, anon, authenticated;

select cron.schedule(
  'send-morning-notifications',
  '*/15 * * * *',
  $$select public.dispatch_morning_notifications();$$
);

/* -------------------------------------------------------------------- */
/* 3–6. Nuevo lounge / renovación / ofertas / cumpleaños — muestra real,  */
/*      sembradas una vez al crear el perfil (Story 1.1, AFTER INSERT)   */
/* -------------------------------------------------------------------- */

create or replace function public.seed_sample_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lounge_name text;
begin
  select l.name into v_lounge_name from public.lounges l order by l.created_at asc limit 1;

  insert into public.notifications (member_id, category, icon, title, body, created_at)
  values
    (
      new.id, 'lounges', 'lounge',
      'New lounge: ' || coalesce(v_lounge_name, 'a new partner'),
      'Open to members from today. Quiet rooms, a library bar and a terrace.',
      now() - interval '2 days'
    ),
    (
      new.id, 'membership', 'membership',
      'Your membership renews soon',
      'Nothing to do unless you want to change the plan or the card — manage it from Profile › Membership.',
      now() - interval '1 day'
    ),
    (
      new.id, 'offers', 'offer',
      'Members'' hours this week',
      'A seasonal tasting for members only. Reserve a spot from any lounge profile.',
      now() - interval '3 hours'
    ),
    (
      new.id, 'membership', 'birthday',
      'Your birthday month is coming up',
      'A complimentary day pass lands on your account the month of your birthday — any lounge, any time, on top of your monthly visits.',
      now() - interval '1 hour'
    );

  return new;
end;
$$;

revoke execute on function public.seed_sample_notifications() from public;

drop trigger if exists profile_created_seed_notifications on public.profiles;

create trigger profile_created_seed_notifications
  after insert on public.profiles
  for each row
  execute function public.seed_sample_notifications();
