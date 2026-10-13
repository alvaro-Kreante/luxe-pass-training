-- Epic 8 — Admin & Support. Story 8.1. `support_tickets` nace aquí (dueño,
-- ver docs/DATA-MODEL-MAP.md): issue tracking, log de comunicación,
-- escalación. Solo el rol admin (`has_role('admin')`, tabla `user_roles`
-- nacida en Epic 7) lee y escribe esta tabla — no hay historia de tickets
-- vistos por el propio miembro todavía (Story 6.1 cruza a "support contact",
-- sin conectar).
create sequence if not exists public.support_ticket_seq start with 4418;

create table if not exists public.support_tickets (
  id                uuid primary key default gen_random_uuid(),
  case_number       text not null unique default ('CS-' || nextval('public.support_ticket_seq')::text),
  member_id         uuid not null references auth.users (id) on delete cascade,
  booking_id        uuid references public.bookings (id) on delete set null,
  subject           text not null,
  note              text not null default '',
  status            text not null default 'new' check (status in ('new', 'open', 'waiting', 'escalated', 'resolved')),
  assigned_admin_id uuid references auth.users (id),
  resolution_reason text,
  resolution_note   text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

alter table public.support_tickets enable row level security;

-- Una sola policy "for all": el admin gestiona los casos por completo desde
-- esta consola (no hay un flujo de member-facing tickets que necesite su
-- propia policy de select, a diferencia de `bookings`/`payments`).
create policy "admin manages support tickets"
on public.support_tickets for all
to authenticated
using ( public.has_role('admin') )
with check ( public.has_role('admin') );

create table if not exists public.support_ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets (id) on delete cascade,
  kind       text not null check (kind in ('system', 'email-auto', 'member', 'internal-note', 'partner', 'staff-reply')),
  author     text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.support_ticket_messages enable row level security;

create policy "admin manages support ticket messages"
on public.support_ticket_messages for all
to authenticated
using ( public.has_role('admin') )
with check ( public.has_role('admin') );

-- DESIGN-SYSTEM.md §6 Fase 8: "un no-show reportado por un partner abre un
-- caso automáticamente, con la tarifa ya cobrada y reversible desde
-- soporte". Dispara sobre el mismo cambio que ya escriben
-- `reception_report_no_show`/`partner_report_no_show` (`bookings.sql`) — no
-- hace falta tocar esas dos funciones.
create or replace function public.open_support_ticket_for_no_show()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lounge_name text;
begin
  -- Solo el no-show que reporta el lounge registra fee; el que marca el
  -- admin (`admin_set_booking_status`, Story 8.4) no abre caso.
  if new.no_show is true and old.no_show is distinct from true and new.cancellation_fee_cents is not null then
    select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

    insert into public.support_tickets (member_id, booking_id, subject, note, status)
    values (
      new.member_id,
      new.id,
      'No-show fee charged — ' || new.confirmation_code,
      coalesce(v_lounge_name, new.lounge_id) || ' reported this booking as a no-show. The flat fee of $35.00 was recorded automatically.',
      'new'
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.open_support_ticket_for_no_show() from public;

drop trigger if exists booking_no_show_opens_ticket on public.bookings;

create trigger booking_no_show_opens_ticket
  after update of no_show on public.bookings
  for each row
  execute function public.open_support_ticket_for_no_show();

/* -------------------------------------------------------------------- */
/* "Member search by email, phone, or name"                             */
/* -------------------------------------------------------------------- */

-- SECURITY DEFINER hace falta de verdad: lee `auth.users`/`profiles` de
-- cualquier miembro, no solo el propio. Autorización explícita en el
-- cuerpo (`has_role('admin')`), nunca delegada solo a RLS — mismo criterio
-- que `partner_guest_list`.
--
-- Reglas de búsqueda (más simples que el mock de `lib/admin.ts`, que
-- tokenizaba por palabra): coincidencia de subcadena en nombre/email, los
-- últimos 4+ dígitos de un teléfono bastan, y "LP-######" resuelve directo
-- al miembro dueño de esa reserva. Consulta vacía = todos los miembros,
-- sin límite, del más reciente al más antiguo.
create or replace function public.admin_search_members(p_query text)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  membership_status text,
  deleted_at timestamptz,
  member_since timestamptz,
  open_cases_count int,
  last_visit_date date,
  last_visit_lounge text,
  photo_url text,
  membership_plan text,
  membership_plan_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trimmed text := trim(p_query);
  v_upper text := upper(trim(p_query));
  v_digits text := regexp_replace(trim(p_query), '\D', '', 'g');
  v_booking_member uuid;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  -- Una sola consulta en vez de `admin_member_profile` por fila: con miles
  -- de miembros la versión por fila pasaba de 5 s.
  if v_trimmed = '' then
    return query
      select
        u.id,
        coalesce(p.full_name, split_part(u.email::text, '@', 1)),
        u.email::text,
        p.phone,
        coalesce(p.membership_status, 'active'),
        p.deleted_at,
        p.created_at,
        coalesce(t.open_count, 0),
        v.date,
        v.lounge_name,
        p.photo_url,
        m.plan,
        m.status
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.memberships m on m.member_id = u.id
      left join (
        select st.member_id, count(*)::int as open_count
        from public.support_tickets st
        where st.status <> 'resolved'
        group by st.member_id
      ) t on t.member_id = u.id
      left join lateral (
        select b.date, l.name as lounge_name
        from public.bookings b
        join public.lounges l on l.id = b.lounge_id
        where b.member_id = u.id and b.status <> 'cancelled' and b.status <> 'waitlisted'
        order by b.date desc
        limit 1
      ) v on true
      order by p.created_at desc nulls last;
    return;
  end if;

  if v_upper ~ '^LP-\d+$' then
    select b.member_id into v_booking_member
    from public.bookings b
    where b.confirmation_code = v_upper
    limit 1;

    if v_booking_member is null then
      return;
    end if;

    return query select * from public.admin_member_profile(v_booking_member);
    return;
  end if;

  -- Inclusivo, no exclusivo: una consulta puede coincidir por nombre/email
  -- Y traer dígitos (p. ej. un email de test con timestamp) sin que eso
  -- descarte la coincidencia por nombre — bug real encontrado con TDD
  -- (una primera versión trataba "4+ dígitos en la consulta" como rama
  -- exclusiva y dejaba de buscar por nombre).
  return query
    select r.* from auth.users u
    left join public.profiles p on p.id = u.id
    cross join lateral public.admin_member_profile(u.id) r
    where coalesce(p.full_name, '') ilike '%' || v_trimmed || '%'
       or u.email::text ilike '%' || v_trimmed || '%'
       or (length(v_digits) >= 4 and regexp_replace(coalesce(p.phone, ''), '\D', '', 'g') like '%' || v_digits)
    order by r.member_since desc nulls last
    limit 25;
end;
$$;

grant execute on function public.admin_search_members(text) to authenticated;

/* -------------------------------------------------------------------- */
/* Ficha de miembro                                                      */
/* -------------------------------------------------------------------- */

create or replace function public.admin_member_profile(p_member_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  membership_status text,
  deleted_at timestamptz,
  member_since timestamptz,
  open_cases_count int,
  last_visit_date date,
  last_visit_lounge text,
  photo_url text,
  membership_plan text,
  membership_plan_status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      p.phone,
      coalesce(p.membership_status, 'active'),
      p.deleted_at,
      p.created_at,
      (
        select count(*)::int from public.support_tickets t
        where t.member_id = u.id and t.status <> 'resolved'
      ),
      (
        select b.date from public.bookings b
        where b.member_id = u.id and b.status <> 'cancelled' and b.status <> 'waitlisted'
        order by b.date desc limit 1
      ),
      (
        select l.name from public.bookings b
        join public.lounges l on l.id = b.lounge_id
        where b.member_id = u.id and b.status <> 'cancelled' and b.status <> 'waitlisted'
        order by b.date desc limit 1
      ),
      p.photo_url,
      m.plan,
      m.status
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.memberships m on m.member_id = u.id
    where u.id = p_member_id;
end;
$$;

grant execute on function public.admin_member_profile(uuid) to authenticated;

/* -------------------------------------------------------------------- */
/* "Complete booking history view"                                      */
/* -------------------------------------------------------------------- */

create or replace function public.admin_member_bookings(p_member_id uuid)
returns table (
  id uuid,
  confirmation_code text,
  lounge_id text,
  lounge_name text,
  lounge_area text,
  date date,
  band text,
  slot_time text,
  status text,
  no_show boolean,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  cancellation_fee_cents int,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.id, b.confirmation_code, b.lounge_id, l.name, l.neighborhood,
      b.date, b.band, b.slot_time, b.status, b.no_show,
      b.checked_in_at, b.cancelled_at, b.cancellation_fee_cents, b.created_at
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    where b.member_id = p_member_id
    order by b.date desc, b.slot_time desc;
end;
$$;

grant execute on function public.admin_member_bookings(uuid) to authenticated;

/* -------------------------------------------------------------------- */
/* Story 8.4 — Bookings Overview: todas las reservas de un día, de toda */
/* la red. Filtros y búsqueda se aplican en cliente sobre este día.    */
/* -------------------------------------------------------------------- */

create or replace function public.admin_bookings_on(p_date date)
returns table (
  id uuid,
  confirmation_code text,
  member_id uuid,
  member_name text,
  lounge_id text,
  lounge_name text,
  lounge_area text,
  date date,
  band text,
  slot_time text,
  status text,
  no_show boolean,
  is_day_pass boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.id, b.confirmation_code, b.member_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      b.lounge_id, l.name, l.neighborhood,
      b.date, b.band, b.slot_time, b.status, b.no_show,
      exists (
        select 1 from public.payments pm
        where pm.booking_id = b.id and pm.status = 'succeeded'
      )
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.date = p_date
      and b.status <> 'waitlisted'
    order by b.created_at;
end;
$$;

revoke execute on function public.admin_bookings_on(date) from public, anon;
grant execute on function public.admin_bookings_on(date) to authenticated;

/* -------------------------------------------------------------------- */
/* "Payment transaction details"                                        */
/* -------------------------------------------------------------------- */

-- Une dos fuentes reales distintas: cargos de verdad contra Stripe
-- (`payments`) y tarifas solo REGISTRADAS, nunca cobradas de verdad
-- (`bookings.cancellation_fee_cents`, ver CLAUDE.md §Alcance Story 6.1) —
-- `kind` distingue una de otra para que el cliente nunca las confunda.
create or replace function public.admin_member_payments(p_member_id uuid)
returns table (
  kind text,
  id uuid,
  booking_id uuid,
  title text,
  detail text,
  amount_cents int,
  status text,
  stripe_payment_intent_id text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      'payment'::text,
      p.id,
      p.booking_id,
      case when l.name is not null then l.name || ' · ' || to_char(b.date, 'Mon DD') else 'Day pass' end,
      coalesce(p.stripe_payment_intent_id, p.stripe_checkout_session_id, ''),
      p.amount_cents,
      p.status,
      p.stripe_payment_intent_id,
      p.created_at
    from public.payments p
    left join public.bookings b on b.id = p.booking_id
    left join public.lounges l on l.id = b.lounge_id
    where p.member_id = p_member_id

    union all

    select
      'fee'::text,
      b.id,
      b.id,
      case when b.no_show then 'No-show fee · ' || l.name else 'Late cancellation fee · ' || l.name end,
      to_char(b.date, 'Mon DD'),
      b.cancellation_fee_cents,
      'recorded',
      null,
      coalesce(b.cancelled_at, b.checked_in_at, b.updated_at)
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    where b.member_id = p_member_id and b.cancellation_fee_cents is not null

    order by created_at desc;
end;
$$;

grant execute on function public.admin_member_payments(uuid) to authenticated;

/* -------------------------------------------------------------------- */
/* "Booking modification capabilities" — override explícito incluido    */
/* -------------------------------------------------------------------- */

create or replace function public.admin_reschedule_booking(
  p_booking_id uuid,
  p_date date,
  p_band text,
  p_slot_time text,
  p_override boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_was_confirmed boolean;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'Booking cannot be modified from status %', v_booking.status;
  end if;

  v_was_confirmed := v_booking.status = 'confirmed';

  -- Plazas en vivo (`lounge_availability.sql`): mover la reserva libera sola
  -- su franja anterior, no hay contador que devolver.
  if not p_override then
    if not public.lounge_band_is_open(v_booking.lounge_id, p_date, p_band) then
      raise exception 'No availability window for % on % (%)', v_booking.lounge_id, p_date, p_band;
    end if;

    perform pg_advisory_xact_lock(hashtext(v_booking.lounge_id || '|' || p_date::text || '|' || p_band));

    if public.lounge_seats_left(v_booking.lounge_id, p_date, p_band)
       + (case when v_was_confirmed and v_booking.date = p_date and v_booking.band = p_band then 1 else 0 end)
       <= 0 then
      raise exception 'No seats left for % on % (%) — use the override', v_booking.lounge_id, p_date, p_band;
    end if;
  end if;

  update public.bookings b
    set date = p_date, band = p_band, slot_time = p_slot_time, status = 'confirmed', updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.admin_reschedule_booking(uuid, date, text, text, boolean) to authenticated;

create or replace function public.admin_cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'Booking cannot be cancelled from status %', v_booking.status;
  end if;

  update public.bookings b
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.admin_cancel_booking(uuid) to authenticated;

-- Story 8.4 — el admin corrige el status de una reserva (drawer "Change the
-- status"). Decisiones del 13 oct 2026:
--   - marcar no-show desde el admin NO registra el fee ni abre caso (el fee
--     y el caso salen solo del lounge, `partner_report_no_show`/
--     `reception_report_no_show`);
--   - dejar de ser no-show o cancelada borra el fee registrado;
--   - volver de cancelada comprueba plaza en la franja, salvo override.
create or replace function public.admin_set_booking_status(
  p_booking_id uuid,
  p_status text,
  p_override boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('confirmed', 'checked-in', 'no-show') then
    raise exception 'Unknown status %', p_status;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_booking.status = 'cancelled' and not p_override then
    perform pg_advisory_xact_lock(hashtext(v_booking.lounge_id || '|' || v_booking.date::text || '|' || v_booking.band));
    if public.lounge_seats_left(v_booking.lounge_id, v_booking.date, v_booking.band) <= 0 then
      raise exception 'No seats left for % on % (%) — use the override', v_booking.lounge_id, v_booking.date, v_booking.band;
    end if;
  end if;

  update public.bookings b
    set status = case p_status when 'confirmed' then 'confirmed' when 'checked-in' then 'in_progress' else 'completed' end,
        no_show = p_status = 'no-show',
        no_show_reason = case when p_status = 'no-show' then b.no_show_reason end,
        checked_in_at = case when p_status = 'checked-in' then coalesce(b.checked_in_at, now()) end,
        cancelled_at = null,
        cancellation_fee_cents = case when p_status = 'no-show' and b.no_show then b.cancellation_fee_cents end,
        updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$$;

revoke execute on function public.admin_set_booking_status(uuid, text, boolean) from public, anon;
grant execute on function public.admin_set_booking_status(uuid, text, boolean) to authenticated;

-- Story 7.1 — el partner corrige su propio error del día: "Undo check-in" /
-- "Undo no-show" devuelven la reserva a confirmed (decisión del 13 oct
-- 2026, opción "solo hoy"). Los lounges no guardan zona horaria, así que el
-- servidor acepta ayer/hoy/mañana de su reloj; la pantalla solo lo ofrece
-- en el día de hoy del lounge. Deshacer un no-show borra el fee y lo anota
-- en el caso de soporte que abrió `booking_no_show_opens_ticket`.
create or replace function public.partner_undo_booking_status(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_was_no_show boolean;
  v_lounge_name text;
begin
  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.lounge_id in (select public.partner_lounge_ids())
    and b.date between current_date - 1 and current_date + 1
    and ((b.status = 'in_progress' and not b.no_show) or (b.status = 'completed' and b.no_show))
  for update;

  if v_booking.id is null then
    raise exception 'Booking not found, not from today, nothing to undo, or not authorized';
  end if;

  v_was_no_show := v_booking.no_show;

  update public.bookings b
    set status = 'confirmed', checked_in_at = null, no_show = false, no_show_reason = null,
        cancellation_fee_cents = null, updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  if v_was_no_show then
    select l.name into v_lounge_name from public.lounges l where l.id = v_booking.lounge_id;
    insert into public.support_ticket_messages (ticket_id, kind, author, body)
    select t.id, 'partner', coalesce(v_lounge_name, v_booking.lounge_id),
           coalesce(v_lounge_name, v_booking.lounge_id) || ' undid the no-show for ' || v_booking.confirmation_code
             || '. The $35.00 fee was removed.'
    from public.support_tickets t
    where t.booking_id = v_booking.id;
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.partner_undo_booking_status(uuid) from public, anon;
grant execute on function public.partner_undo_booking_status(uuid) to authenticated;

/* -------------------------------------------------------------------- */
/* Mesa de soporte: cola de casos + detalle de un caso                  */
/* -------------------------------------------------------------------- */

create or replace function public.admin_list_support_tickets()
returns table (
  id uuid,
  case_number text,
  member_id uuid,
  member_name text,
  status text,
  subject text,
  note text,
  assigned_admin_id uuid,
  assigned_admin_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      t.id, t.case_number, t.member_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      t.status, t.subject, t.note,
      t.assigned_admin_id,
      case when a.email is not null then split_part(a.email::text, '@', 1) end,
      t.created_at
    from public.support_tickets t
    join auth.users u on u.id = t.member_id
    left join public.profiles p on p.id = t.member_id
    left join auth.users a on a.id = t.assigned_admin_id
    order by t.created_at desc;
end;
$$;

grant execute on function public.admin_list_support_tickets() to authenticated;

create or replace function public.admin_ticket_counts()
returns table (
  open_count int,
  waiting_count int,
  escalated_count int,
  resolved_today_count int,
  total_count int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      count(*) filter (where status = 'open')::int,
      count(*) filter (where status = 'waiting')::int,
      count(*) filter (where status = 'escalated')::int,
      count(*) filter (where status = 'resolved' and resolved_at >= date_trunc('day', now()))::int,
      count(*)::int
    from public.support_tickets;
end;
$$;

grant execute on function public.admin_ticket_counts() to authenticated;

-- `booking_fee_cents`/`payment_*` alimentan la decisión de `RefundModal`
-- (`src/components/admin/refund-modal.tsx`): una tarifa solo registrada se
-- "waives" (`admin_waive_booking_fee`, sin Stripe detrás — nunca se cobró de
-- verdad); un pago real `succeeded` se reembolsa de verdad vía la Edge
-- Function `stripe-refund-payment`.
create or replace function public.admin_get_ticket(p_case_number text)
returns table (
  id uuid,
  case_number text,
  member_id uuid,
  member_name text,
  member_email text,
  status text,
  subject text,
  note text,
  assigned_admin_id uuid,
  assigned_admin_name text,
  resolution_reason text,
  resolution_note text,
  created_at timestamptz,
  resolved_at timestamptz,
  booking_id uuid,
  booking_confirmation_code text,
  booking_fee_cents int,
  payment_id uuid,
  payment_amount_cents int,
  payment_status text,
  payment_intent_id text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      t.id, t.case_number, t.member_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      t.status, t.subject, t.note,
      t.assigned_admin_id,
      case when a.email is not null then split_part(a.email::text, '@', 1) end,
      t.resolution_reason, t.resolution_note,
      t.created_at, t.resolved_at,
      b.id, b.confirmation_code, b.cancellation_fee_cents,
      pay.id, pay.amount_cents, pay.status, pay.stripe_payment_intent_id
    from public.support_tickets t
    join auth.users u on u.id = t.member_id
    left join public.profiles p on p.id = t.member_id
    left join auth.users a on a.id = t.assigned_admin_id
    left join public.bookings b on b.id = t.booking_id
    left join public.payments pay on pay.booking_id = t.booking_id and pay.status = 'succeeded'
    where t.case_number = upper(trim(p_case_number));
end;
$$;

grant execute on function public.admin_get_ticket(text) to authenticated;

-- "Waive and refund" cuando lo que se reversa es una tarifa solo
-- REGISTRADA (nunca cobrada de verdad, ver comentario de
-- `admin_member_payments`): no hay nada que reversar en Stripe, así que
-- esto es la mitad "waive" — limpia la tarifa y quita el no-show del
-- historial, tal como promete `RefundModal`. La mitad "refund" de un cargo
-- real pasa por la Edge Function `stripe-refund-payment`, no por aquí.
create or replace function public.admin_waive_booking_fee(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  update public.bookings b
    set cancellation_fee_cents = null, no_show = false, updated_at = now()
    where b.id = p_booking_id and b.cancellation_fee_cents is not null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found or has no fee to waive';
  end if;

  return v_booking;
end;
$$;

grant execute on function public.admin_waive_booking_fee(uuid) to authenticated;
