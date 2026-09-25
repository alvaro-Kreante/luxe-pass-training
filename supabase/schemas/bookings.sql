-- Story 4.1 — nace aquí, dueña del Epic 4 (ver docs/DATA-MODEL-MAP.md). El
-- dominio de `status` ya incluye los valores que Epic 5/6 asignarán más
-- adelante (in_progress/completed/cancelled) para no tener que ampliar este
-- CHECK cuando esos epics se conecten a su vez — Story 4.1 solo produce
-- 'confirmed'/'waitlisted'.
--
-- `slot_time` en vez de `time` (palabra reservada de Postgres, rompe el
-- parser de pg-delta al usarse como nombre de columna/campo de record).
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references auth.users (id) on delete cascade,
  lounge_id         text not null references public.lounges (id) on delete cascade,
  date              date not null,
  band              text not null check (band in ('morning', 'afternoon', 'evening', 'late')),
  slot_time         text not null check (
    slot_time in ('8:00 AM', '10:30 AM', '1:00 PM', '3:30 PM', '6:00 PM')
  ),
  special_requests  text not null default '' check (char_length(special_requests) <= 100),
  status            text not null default 'confirmed' check (
    status in ('confirmed', 'in_progress', 'completed', 'cancelled', 'waitlisted')
  ),
  -- Story 5.2 — "No-show tracking for booking history". No es un valor de
  -- `status` (ese dominio no tiene 'no_show', ver comentario de arriba):
  -- un no-show cierra la reserva con `status='completed'` + `no_show=true`,
  -- para que Epic 6 (historial) distinga "completed" de "no-show" sin
  -- ampliar el CHECK. `checked_in_at` es la contraparte positiva.
  checked_in_at     timestamptz,
  no_show           boolean not null default false,
  -- Story 5.3 — evita que el cron de recordatorios (`booking_reminders.sql`)
  -- reenvíe el email si vuelve a correr dentro de la misma ventana de 24h.
  reminder_sent_at  timestamptz,
  -- Story 6.2 — evita que el cron del aviso de las 6 AM
  -- (`notifications.sql`) reenvíe el aviso si vuelve a correr dentro de la
  -- misma ventana.
  morning_notification_sent_at timestamptz,
  -- Story 7.1 — "No-show reporting functionality" (`NoShow.dc.html`, "What
  -- happened?"). Solo lo escribe `partner_report_no_show` de más abajo.
  no_show_reason text check (no_show_reason in ('never-arrived', 'arrived-after-window', 'something-else')),
  -- Story 6.1 — "No show policy enforcement - flat fee" / "24-hour advance
  -- notice requirement for cancellation". Decisión consciente (ver
  -- CLAUDE.md): el fee se REGISTRA, nunca se cobra de verdad — no hay
  -- PaymentIntent ni cargo contra Stripe detrás de esta columna, a
  -- diferencia del pago de la reserva (Story 4.2).
  cancellation_fee_cents integer,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Story 5.1 — "Unique confirmation number generated for each booking LP#".
-- Columna generada, no una insertada aparte: `bookingReferenceFromId` (TS,
-- `src/lib/booking.ts`) y su réplica en `send-booking-receipt/index.ts` ya
-- derivan el LP# del `id` de la reserva — esta función replica el mismo
-- algoritmo en SQL (**debe coincidir con las otras dos**, ver ese comentario)
-- para poder indexarlo y que `/reception` busque por LP# sin escanear toda
-- la tabla.
--
-- Hash posicional (`hash*31 + code`, `% 900000` en cada paso), no una suma
-- simple de códigos ASCII: la suma es conmutativa (dos UUID que son
-- anagramas entre sí colisionan en el mismo LP#) — un bug real de verdad
-- desde que este código es una clave de búsqueda (checkin de recepción,
-- pase digital), no solo copy decorativo del recibo. Reproducido y
-- corregido en las tres implementaciones a la vez.
create or replace function public.booking_reference(p_booking_id uuid)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_seed text := p_booking_id::text;
  v_hash integer := 0;
begin
  for i in 1..length(v_seed) loop
    v_hash := (v_hash * 31 + ascii(substr(v_seed, i, 1))) % 900000;
  end loop;

  return 'LP-' || (100000 + v_hash)::text;
end;
$$;

alter table public.bookings
  add column if not exists confirmation_code text generated always as (public.booking_reference(id)) stored;

create index if not exists bookings_confirmation_code_idx on public.bookings (confirmation_code);

-- Disponibilidad en vivo (`lounge_availability.sql`) cuenta reservas por
-- lounge/fecha/franja en cada consulta.
create index if not exists bookings_lounge_date_band_idx on public.bookings (lounge_id, date, band);

alter table public.bookings enable row level security;

-- Una sola policy (no dos OR'd por Postgres) para evitar el warning de
-- "multiple permissive policies" de `supabase db advisors`: el miembro
-- dueño de la reserva, o (Story 7.1) el partner que gestiona ese lounge
-- (`partner_lounge_ids()` en `partners.sql`) — esto último también hace
-- falta para que la suscripción de Realtime del cliente (`postgres_changes`
-- respeta RLS) reciba los inserts/updates de su propio lounge, sin depender
-- solo de la RPC de más abajo.
create policy "select own or managed bookings"
on public.bookings for select
to authenticated
using (
  (select auth.uid()) = member_id
  or lounge_id in (select public.partner_lounge_ids())
);

-- Sin policies de insert/update/delete: la tabla solo se toca vía las
-- funciones de abajo (SECURITY DEFINER), igual que `login_attempts` en la
-- Story 1.2.

-- AC "Final availability check before one-tap confirmation". Las plazas se
-- calculan en vivo (`lounge_seats_left`, ver `lounge_availability.sql`). Un
-- `pg_advisory_xact_lock` por lounge/fecha/franja serializa las
-- confirmaciones concurrentes sobre la misma franja, para que dos no cuenten
-- a la vez la misma última plaza. Si no quedan plazas, no inserta nada y
-- devuelve cero filas — el cliente lo lee como "full" y ofrece la waitlist
-- (AC "If full, option to be on the waitlist") sin crear una reserva que el
-- miembro todavía no pidió.
--
-- `p_payment_id` (Story 4.2) — se pasa cuando el pago ya se cobró de verdad
-- (Stripe confirmado en el cliente antes de esta llamada, ver
-- `CLAUDE.md` §Procesamiento de pagos): liga `payments.booking_id` a la
-- reserva recién creada, en la misma transacción. `null` cuando la visita
-- está cubierta por la membresía (sin pago que ligar).
create or replace function public.confirm_booking(
  p_lounge_id text,
  p_date date,
  p_band text,
  p_slot_time text,
  p_special_requests text default '',
  p_payment_id uuid default null
)
returns table (
  id uuid,
  status text,
  date date,
  band text,
  slot_time text,
  special_requests text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_booking public.bookings;
  v_coverage record;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Epic 9 — quién paga (ver booking_coverage.sql). Antes, sin
  -- `p_payment_id`, la reserva salía gratis sin comprobar nada.
  if p_payment_id is null then
    select * into v_coverage from public.booking_coverage_for(v_member_id, p_date);
    if v_coverage.kind = 'none' then
      raise exception 'Payment required for this booking';
    end if;
  else
    -- Un pago del propio miembro, de un day pass (no de membresía), que aún
    -- no pague otra reserva. 'pending' vale: con tarjeta nueva el webhook de
    -- Stripe puede llegar después de esta llamada (ver summary/page.tsx).
    perform 1 from public.payments p
    where p.id = p_payment_id
      and p.member_id = v_member_id
      and p.booking_id is null
      and p.membership_plan is null
      and p.status in ('pending', 'succeeded');
    if not found then
      raise exception 'Invalid payment for this booking';
    end if;
  end if;

  if not public.lounge_band_is_open(p_lounge_id, p_date, p_band) then
    raise exception 'No availability window for % on % (%)', p_lounge_id, p_date, p_band;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_lounge_id || '|' || p_date::text || '|' || p_band));

  if public.lounge_seats_left(p_lounge_id, p_date, p_band) <= 0 then
    return;
  end if;

  insert into public.bookings as b
    (member_id, lounge_id, date, band, slot_time, special_requests, status)
  values
    (v_member_id, p_lounge_id, p_date, p_band, p_slot_time, coalesce(p_special_requests, ''), 'confirmed')
  returning b.* into v_booking;

  if p_payment_id is not null then
    update public.payments p
      set booking_id = v_booking.id, updated_at = now()
      where p.id = p_payment_id and p.member_id = v_member_id;
  elsif v_coverage.kind = 'day_pass_credit' then
    insert into public.day_pass_redemptions (member_id, booking_id, source)
    values (v_member_id, v_booking.id, v_coverage.credit_source);
  end if;

  return query
    select
      v_booking.id, v_booking.status, v_booking.date, v_booking.band,
      v_booking.slot_time, v_booking.special_requests, v_booking.created_at;
end;
$$;

grant execute on function public.confirm_booking(text, date, text, text, text, uuid) to authenticated;

-- Solo se llama cuando el miembro elige "Join the waitlist" en
-- `Waitlist.dc.html` tras un `confirm_booking` que devolvió cero filas — una
-- reserva 'waitlisted' no ocupa plaza (`booking_occupies_seat`; la waitlist
-- no reserva inventario real, ninguna historia lo pide).
create or replace function public.join_waitlist(
  p_lounge_id text,
  p_date date,
  p_band text,
  p_slot_time text,
  p_special_requests text default ''
)
returns table (
  id uuid,
  status text,
  date date,
  band text,
  slot_time text,
  special_requests text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.bookings as b
    (member_id, lounge_id, date, band, slot_time, special_requests, status)
  values
    (v_member_id, p_lounge_id, p_date, p_band, p_slot_time, coalesce(p_special_requests, ''), 'waitlisted')
  returning b.* into v_booking;

  return query
    select
      v_booking.id, v_booking.status, v_booking.date, v_booking.band,
      v_booking.slot_time, v_booking.special_requests, v_booking.created_at;
end;
$$;

grant execute on function public.join_waitlist(text, date, text, text, text) to authenticated;

-- Story 5.2 — Lounge Check-In Process. `/reception` no tiene login de
-- personal (gap señalado en docs/PENDIENTES.md, y docs/DATA-MODEL-MAP.md
-- deja el rol staff/partner para cuando arranque el Epic 7, no antes) —
-- decisión consciente (ver CLAUDE.md): estas cuatro funciones son un RPC
-- "de kiosco", autorizado solo por conocer el LP# de hoy en el lounge
-- correcto, igual que un lector físico de QR en el mostrador de recepción.
-- Se conceden a `anon` a propósito — la consola no inicia sesión de
-- miembro ni de staff. Documentado como desviación consciente en
-- docs/design/COMPONENT-MAP.md "Backend real — Epic 5".
--
-- `p_date` en vez de `current_date`: todo el proyecto trabaja sobre el "hoy"
-- de mockup fijo (`TODAY` en `src/lib/availability.ts`, 2025-09-09), no el
-- reloj real de Postgres — igual que `confirm_booking` recibe `p_date`
-- como parámetro en vez de asumirlo. El cliente (`src/lib/reception.ts`)
-- siempre manda `TODAY`.
create or replace function public.reception_lookup_booking(
  p_lounge_id text,
  p_date date,
  p_confirmation_code text
)
returns table (
  id uuid,
  confirmation_code text,
  member_name text,
  member_email text,
  slot_time text,
  special_requests text,
  status text,
  checked_in_at timestamptz,
  no_show boolean,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select b.* into v_booking
  from public.bookings b
  where b.lounge_id = p_lounge_id
    and b.date = p_date
    and b.confirmation_code = upper(trim(p_confirmation_code))
    and b.status <> 'cancelled';

  if v_booking.id is null then
    return;
  end if;

  return query
    select
      v_booking.id,
      v_booking.confirmation_code,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      v_booking.slot_time,
      v_booking.special_requests,
      v_booking.status,
      v_booking.checked_in_at,
      v_booking.no_show,
      p.emergency_contact_name,
      p.emergency_contact_relation,
      p.emergency_contact_phone
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = v_booking.member_id;
end;
$$;

grant execute on function public.reception_lookup_booking(text, date, text) to anon, authenticated;

-- AC "Instant verification of booking validity" + "Check-in confirmation to
-- member's app" (el miembro ve `status='in_progress'` al recargar /my-pass,
-- ver src/lib/passes.ts). Idempotente por construcción: una segunda llamada
-- no encuentra fila `checked_in_at is null` y falla con un mensaje claro en
-- vez de reescribir el check-in.
create or replace function public.reception_checkin_booking(
  p_lounge_id text,
  p_date date,
  p_confirmation_code text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  update public.bookings b
    set checked_in_at = now(), status = 'in_progress', updated_at = now()
    where b.lounge_id = p_lounge_id
      and b.date = p_date
      and b.confirmation_code = upper(trim(p_confirmation_code))
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'No confirmed booking for % at % on %, or it is already checked in', p_confirmation_code, p_lounge_id, p_date;
  end if;

  return v_booking;
end;
$$;

grant execute on function public.reception_checkin_booking(text, date, text) to anon, authenticated;

-- AC "No-show tracking for booking history". No hay valor 'no_show' en
-- `status` (ver comentario de la tabla) — cierra la reserva como
-- 'completed' con `no_show=true`, para que Epic 6 (historial) distinga los
-- dos casos. Story 6.1 — "No show policy enforcement - flat fee": registra
-- los mismos $35.00 planos que `cancel_booking` (LATE_CANCELLATION_FEE_LABEL
-- en `src/lib/passes.ts`), sin cobrarlos de verdad.
create or replace function public.reception_report_no_show(
  p_lounge_id text,
  p_date date,
  p_confirmation_code text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  update public.bookings b
    set no_show = true, status = 'completed', cancellation_fee_cents = 3500, updated_at = now()
    where b.lounge_id = p_lounge_id
      and b.date = p_date
      and b.confirmation_code = upper(trim(p_confirmation_code))
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'No confirmed booking for % at % on %, or it already checked in', p_confirmation_code, p_lounge_id, p_date;
  end if;

  return v_booking;
end;
$$;

grant execute on function public.reception_report_no_show(text, date, text) to anon, authenticated;

-- Decorativo pero real (contador "N expected today / M checked in" de la
-- topbar de `/reception`) — agregado barato sobre el índice de
-- `(lounge_id, date)` que ya usan las funciones de arriba.
create or replace function public.reception_today_summary(p_lounge_id text, p_date date)
returns table (expected integer, checked_in integer)
language sql
security definer
set search_path = ''
as $$
  select
    count(*) filter (where status <> 'cancelled')::int,
    count(*) filter (where checked_in_at is not null)::int
  from public.bookings
  where lounge_id = p_lounge_id and date = p_date;
$$;

grant execute on function public.reception_today_summary(text, date) to anon, authenticated;

-- Story 6.1 (Epic 6) — "Modification options: Cancel", "24-hour advance
-- notice requirement for cancellation", "No show policy enforcement - flat
-- fee". `p_today` en vez de `current_date`, mismo criterio que
-- `confirm_booking`/las RPC de recepción: todo el proyecto trabaja sobre el
-- "hoy" de mockup fijo (`TODAY` en `src/lib/availability.ts`), no el reloj
-- real — el cliente manda siempre `TODAY` (ver `isFreeCancellation` en
-- `src/lib/passes.ts`, que ya calcula `hoursUntilArrival` con el mismo
-- criterio de días completos × 24, replicado aquí para que la decisión
-- servidor/cliente coincida siempre).
--
-- Solo el miembro dueño de la reserva puede cancelarla (`auth.uid()`, no un
-- RPC "de kiosco" como los de recepción) — 'waitlisted' cancela sin fee (no
-- hay reserva de verdad que perder); 'confirmed' cobra el fee si quedan
-- menos de 24h. El resto de estados ('in_progress', 'completed',
-- 'cancelled') no son cancelables — ya se hizo check-in, ya cerró o ya
-- estaba cancelada.
create or replace function public.cancel_booking(p_booking_id uuid, p_today date)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_booking public.bookings;
  v_hours_until_arrival integer;
  v_fee_cents integer := null;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.member_id = v_member_id
  for update;

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'Booking cannot be cancelled from status %', v_booking.status;
  end if;

  if v_booking.status = 'confirmed' then
    v_hours_until_arrival := greatest(v_booking.date - p_today, 0) * 24;
    if v_hours_until_arrival < 24 then
      v_fee_cents := 3500;
    end if;
  end if;

  update public.bookings b
    set status = 'cancelled', cancelled_at = now(), cancellation_fee_cents = v_fee_cents, updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid, date) to authenticated;

-- Story 7.1 — Daily Guest Management. A diferencia de las RPC "de kiosco" de
-- recepción (arriba, `anon`/`authenticated` sin sesión real), el partner sí
-- tiene una sesión real (`auth.uid()`) — SECURITY DEFINER hace falta de
-- verdad para leer `profiles`/`auth.users` de otros miembros, pero la
-- autorización se verifica explícitamente contra `partner_lounge_ids()`
-- (`partners.sql`) al principio del cuerpo, no se delega solo a RLS.
--
-- `member_email`/`member_phone`/`emergency_contact` vuelven `null` cuando la
-- reserva está cancelada — "Contact details are shown while the booking is
-- open" (`GuestDetail.dc.html`), decisión de producto de DESIGN-SYSTEM.md §6
-- Fase 2.
--
-- `is_day_pass`: no hay un campo de "tipo de visita" en `profiles`/`bookings`
-- (Epic 9, planes de membresía, sigue sin conectar) — se deriva de si la
-- reserva tiene un pago real cobrado de verdad (Epic 4): con pago
-- `succeeded` es una visita de day pass; sin pago ligado, la cubre la
-- membresía. Documentado como decisión consciente en
-- docs/design/COMPONENT-MAP.md "Backend real — Epic 7".
--
-- `visit_number`: recuento de visitas del mismo miembro en este lounge
-- (nunca global) hasta esta reserva inclusive — "niveles de lealtad
-- contados solo por local" (DESIGN-SYSTEM.md §6 Fase 2).
create or replace function public.partner_guest_list(p_lounge_id text, p_date date)
returns table (
  id uuid,
  confirmation_code text,
  member_name text,
  member_email text,
  member_phone text,
  band text,
  slot_time text,
  status text,
  checked_in_at timestamptz,
  no_show boolean,
  no_show_reason text,
  special_requests text,
  created_at timestamptz,
  is_day_pass boolean,
  visit_number integer,
  emergency_contact text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lounge_id not in (select public.partner_lounge_ids()) then
    raise exception 'Not authorized for lounge %', p_lounge_id;
  end if;

  return query
    select
      b.id,
      b.confirmation_code,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      case when b.status <> 'cancelled' then u.email::text end,
      case when b.status <> 'cancelled' then p.phone end,
      b.band,
      b.slot_time,
      b.status,
      b.checked_in_at,
      b.no_show,
      b.no_show_reason,
      b.special_requests,
      b.created_at,
      exists (
        select 1 from public.payments pm
        where pm.booking_id = b.id and pm.status = 'succeeded'
      ),
      (
        select count(*)::int from public.bookings b2
        where b2.member_id = b.member_id
          and b2.lounge_id = b.lounge_id
          and b2.status <> 'cancelled'
          and b2.date <= b.date
      ),
      case
        when b.status <> 'cancelled' and p.emergency_contact_name is not null and p.emergency_contact_phone is not null
          then p.emergency_contact_name
            || coalesce(' · ' || nullif(p.emergency_contact_relation, ''), '')
            || ' · ' || p.emergency_contact_phone
        else null
      end
    from public.bookings b
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.lounge_id = p_lounge_id and b.date = p_date
    order by b.slot_time, b.created_at;
end;
$$;

grant execute on function public.partner_guest_list(text, date) to authenticated;

-- Story 7.1 — "Check-in status tracking for each guest" (la casilla de
-- asistencia). Equivalente autenticado de `reception_checkin_booking`, pero
-- por `id` de reserva (el partner ya la ve en su propia lista, no necesita
-- buscar por LP#) y autorizado contra `partner_lounge_ids()` en vez de
-- LP#+lounge+fecha.
create or replace function public.partner_checkin_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  update public.bookings b
    set checked_in_at = now(), status = 'in_progress', updated_at = now()
    where b.id = p_booking_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found, not confirmed, already checked in, or not authorized';
  end if;

  return v_booking;
end;
$$;

grant execute on function public.partner_checkin_booking(uuid) to authenticated;

-- Story 7.1 — "No-show reporting functionality" (`NoShow.dc.html`, "What
-- happened?"). Mismo fee plano de $35.00 que `reception_report_no_show`/
-- Story 6.1 (registrado, nunca cobrado de verdad) — la parte del partner en
-- ese fee ($17.50) no se guarda aquí, se calcula en la analítica (Story 7.3,
-- `NO_SHOW_PARTNER_SHARE` en `src/lib/partner.ts`) a partir del recuento de
-- no-shows.
create or replace function public.partner_report_no_show(p_booking_id uuid, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if p_reason not in ('never-arrived', 'arrived-after-window', 'something-else') then
    raise exception 'Invalid no-show reason %', p_reason;
  end if;

  update public.bookings b
    set no_show = true, no_show_reason = p_reason, status = 'completed', cancellation_fee_cents = 3500, updated_at = now()
    where b.id = p_booking_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found, not confirmed, already checked in, or not authorized';
  end if;

  return v_booking;
end;
$$;

grant execute on function public.partner_report_no_show(uuid, text) to authenticated;
