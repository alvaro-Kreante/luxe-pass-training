SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_amenity_demand (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    amenity  text,
    bookings integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select a.amenity, count(*)::int
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    cross join lateral unnest(l.amenities) as a(amenity)
    where b.date between p_from and p_to
    group by a.amenity
    order by count(*) desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_bookings_by_day (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    day      date,
    bookings integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select d.day::date, count(b.id)::int
    from generate_series(p_from, p_to, interval '1 day') as d(day)
    left join public.bookings b on b.date = d.day::date
    group by d.day
    order by d.day;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_bookings_on (
  p_date date
)
  RETURNS TABLE (
    id                uuid,
    confirmation_code text,
    member_id         uuid,
    member_name       text,
    lounge_id         text,
    lounge_name       text,
    lounge_area       text,
    date              date,
    band              text,
    slot_time         text,
    status            text,
    no_show           boolean,
    is_day_pass       boolean
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_cancel_booking (
  p_booking_id uuid
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_city_demand (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    city     text,
    lounges  integer,
    bookings integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      l.city,
      count(distinct l.id)::int,
      count(b.id)::int
    from public.lounges l
    left join public.bookings b on b.lounge_id = l.id and b.date between p_from and p_to
    group by l.city
    having count(b.id) > 0
    order by count(b.id) desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_csv_row (
  p_cells text[]
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select string_agg('"' || replace(coalesce(c, ''), '"', '""') || '"', ',')
  from unnest(p_cells) as c;
$function$;

CREATE OR REPLACE FUNCTION public.admin_export_bookings (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    confirmation_code    text,
    member_id            uuid,
    member_name          text,
    member_email         text,
    member_phone         text,
    lounge_name          text,
    city                 text,
    date                 date,
    slot_time            text,
    status               text,
    amount_charged_cents integer,
    payment_method       text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null`.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.confirmation_code,
      b.member_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      p.phone,
      l.name,
      l.city,
      b.date,
      b.slot_time,
      b.status,
      coalesce(pm.amount_cents, b.cancellation_fee_cents, 0),
      case when pm.id is not null then 'Stripe' when b.cancellation_fee_cents is not null then 'Fee recorded' else 'Membership' end
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    left join public.payments pm on pm.booking_id = b.id and pm.status = 'succeeded'
    where b.date between p_from and p_to
    order by b.date, b.slot_time;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_export_members()
  RETURNS TABLE (
    member_id         uuid,
    full_name         text,
    email             text,
    phone             text,
    membership_status text,
    member_since      timestamp with time zone,
    deleted_at        timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null`.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select u.id, coalesce(p.full_name, split_part(u.email::text, '@', 1)), u.email::text, p.phone,
           coalesce(p.membership_status, 'active'), p.created_at, p.deleted_at
    from auth.users u
    join public.profiles p on p.id = u.id
    order by p.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_export_no_shows_cancellations (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    confirmation_code text,
    member_name       text,
    lounge_name       text,
    date              date,
    status            text,
    no_show           boolean,
    fee_cents         integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null`.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.confirmation_code,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      l.name,
      b.date,
      b.status,
      b.no_show,
      coalesce(b.cancellation_fee_cents, 0)
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.date between p_from and p_to and (b.no_show = true or b.status = 'cancelled')
    order by b.date desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_generate_report_csv (
  p_dataset text,
  p_from    date,
  p_to      date
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_csv text;
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null` — el
  -- cron llama a esta función sin sesión.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  if p_dataset = 'bookings' then
    select 'Reference,Member,Email,Lounge,City,Date,Time,Status,Amount' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[confirmation_code, member_name, member_email, lounge_name, city, date::text, slot_time, status, round(amount_charged_cents / 100.0, 2)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_bookings(p_from, p_to);
  elsif p_dataset = 'members' then
    select 'Name,Email,Phone,Status,Member since' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[full_name, email, coalesce(phone, ''), membership_status, member_since::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_members();
  elsif p_dataset = 'revenue-by-partner' then
    select 'Lounge,Bookings,Gross revenue' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[lounge_name, bookings::text, round(gross_revenue_cents / 100.0, 2)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_revenue_by_partner(p_from, p_to);
  elsif p_dataset = 'no-shows-cancellations' then
    select 'Reference,Member,Lounge,Date,Status,Fee' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[confirmation_code, member_name, lounge_name, date::text, status, round(fee_cents / 100.0, 2)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_no_shows_cancellations(p_from, p_to);
  else
    raise exception 'Unknown dataset %', p_dataset;
  end if;

  return v_csv;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_ticket (
  p_case_number text
)
  RETURNS TABLE (
    id                        uuid,
    case_number               text,
    member_id                 uuid,
    member_name               text,
    member_email              text,
    status                    text,
    subject                   text,
    note                      text,
    assigned_admin_id         uuid,
    assigned_admin_name       text,
    resolution_reason         text,
    resolution_note           text,
    created_at                timestamp with time zone,
    resolved_at               timestamp with time zone,
    booking_id                uuid,
    booking_confirmation_code text,
    booking_fee_cents         integer,
    payment_id                uuid,
    payment_amount_cents      integer,
    payment_status            text,
    payment_intent_id         text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_support_tickets()
  RETURNS TABLE (
    id                  uuid,
    case_number         text,
    member_id           uuid,
    member_name         text,
    status              text,
    subject             text,
    note                text,
    assigned_admin_id   uuid,
    assigned_admin_name text,
    created_at          timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_lounge_popularity (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    lounge_id   text,
    lounge_name text,
    area        text,
    bookings    integer,
    no_shows    integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      l.id, l.name, l.neighborhood || ', ' || l.city,
      count(b.id)::int,
      count(*) filter (where b.no_show = true)::int
    from public.lounges l
    left join public.bookings b on b.lounge_id = l.id and b.date between p_from and p_to
    group by l.id, l.name, l.neighborhood, l.city
    having count(b.id) > 0
    order by count(b.id) desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_member_bookings (
  p_member_id uuid
)
  RETURNS TABLE (
    id                     uuid,
    confirmation_code      text,
    lounge_id              text,
    lounge_name            text,
    lounge_area            text,
    date                   date,
    band                   text,
    slot_time              text,
    status                 text,
    no_show                boolean,
    checked_in_at          timestamp with time zone,
    cancelled_at           timestamp with time zone,
    cancellation_fee_cents integer,
    created_at             timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_member_payments (
  p_member_id uuid
)
  RETURNS TABLE (
    kind                     text,
    id                       uuid,
    booking_id               uuid,
    title                    text,
    detail                   text,
    amount_cents             integer,
    status                   text,
    stripe_payment_intent_id text,
    created_at               timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_member_profile (
  p_member_id uuid
)
  RETURNS TABLE (
    id                     uuid,
    full_name              text,
    email                  text,
    phone                  text,
    membership_status      text,
    deleted_at             timestamp with time zone,
    member_since           timestamp with time zone,
    open_cases_count       integer,
    last_visit_date        date,
    last_visit_lounge      text,
    photo_url              text,
    membership_plan        text,
    membership_plan_status text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_network_summary (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    bookings       integer,
    attended       integer,
    no_shows       integer,
    cancelled      integer,
    joined         integer,
    left_count     integer,
    active_members integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      (select count(*)::int from public.bookings b where b.date between p_from and p_to),
      (select count(*)::int from public.bookings b where b.date between p_from and p_to and b.status <> 'cancelled' and b.no_show = false),
      (select count(*)::int from public.bookings b where b.date between p_from and p_to and b.no_show = true),
      (select count(*)::int from public.bookings b where b.date between p_from and p_to and b.status = 'cancelled'),
      (select count(*)::int from public.profiles p where p.created_at::date between p_from and p_to),
      (select count(*)::int from public.profiles p where p.deleted_at is not null and p.deleted_at::date between p_from and p_to),
      -- Total en vivo, no acotado al período — "active members" es un
      -- estado actual, no algo que un rango de fechas recorte.
      (select count(*)::int from public.profiles p where p.deleted_at is null);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reschedule_booking (
  p_booking_id uuid,
  p_date       date,
  p_band       text,
  p_slot_time  text,
  p_override   boolean DEFAULT false
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_revenue_by_partner (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    lounge_id           text,
    lounge_name         text,
    bookings            integer,
    gross_revenue_cents integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- `auth.uid() is null` cubre la llamada interna desde
  -- `admin_generate_report_csv`/`dispatch_scheduled_reports` (sin sesión,
  -- SECURITY DEFINER encadenado) — un llamador autenticado que no sea admin
  -- se sigue rechazando igual.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      l.id,
      l.name,
      count(b.id)::int,
      coalesce(sum(pm.amount_cents) filter (where pm.status = 'succeeded'), 0)::int
    from public.lounges l
    left join public.bookings b on b.lounge_id = l.id and b.date between p_from and p_to
    left join public.payments pm on pm.booking_id = b.id
    group by l.id, l.name
    having count(b.id) > 0
    order by count(b.id) desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_search_members (
  p_query text
)
  RETURNS TABLE (
    id                     uuid,
    full_name              text,
    email                  text,
    phone                  text,
    membership_status      text,
    deleted_at             timestamp with time zone,
    member_since           timestamp with time zone,
    open_cases_count       integer,
    last_visit_date        date,
    last_visit_lounge      text,
    photo_url              text,
    membership_plan        text,
    membership_plan_status text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_booking_status (
  p_booking_id uuid,
  p_status     text,
  p_override   boolean DEFAULT false
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_ticket_counts()
  RETURNS TABLE (
    open_count           integer,
    waiting_count        integer,
    escalated_count      integer,
    resolved_today_count integer,
    total_count          integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_waive_booking_fee (
  p_booking_id uuid
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.apply_membership_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_current public.memberships;
  v_start timestamptz;
  v_interval interval;
begin
  if new.membership_plan is null or new.status <> 'succeeded' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'succeeded' then
    return new;
  end if;

  select * into v_current from public.memberships where member_id = new.member_id;
  v_start := case
    when v_current.status = 'active' and v_current.current_period_end <= now() then v_current.current_period_end
    else now()
  end;
  v_interval := case new.membership_plan when 'annual' then interval '1 year' else interval '1 month' end;

  insert into public.memberships as m (
    member_id, plan, status, started_at, current_period_start, current_period_end, auto_renew
  )
  values (new.member_id, new.membership_plan, 'active', now(), v_start, v_start + v_interval, true)
  on conflict (member_id) do update set
    plan = excluded.plan,
    status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    auto_renew = true,
    pending_plan = null,
    renewal_notice_sent_at = null,
    renewal_attempted_at = null,
    updated_at = now();

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_booking_of_failed_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.bookings b
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where b.id = new.booking_id
      and b.status in ('confirmed', 'waitlisted');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_membership_plan_change()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.memberships
  set pending_plan = null, updated_at = now()
  where member_id = v_uid and status = 'active';
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_referral_from_signup()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_code text;
  v_email text;
  v_referrer uuid;
begin
  select upper(trim(u.raw_user_meta_data ->> 'referral_code')), u.email
  into v_code, v_email
  from auth.users u
  where u.id = new.id;

  if v_code is null or v_code = '' then
    return new;
  end if;

  select p.id into v_referrer
  from public.profiles p
  where p.referral_code = v_code and p.id <> new.id;

  if v_referrer is null then
    return new;
  end if;

  insert into public.referrals (referrer_id, referee_id, code, referee_name, referee_email)
  values (v_referrer, new.id, v_code, new.full_name, coalesce(v_email, ''))
  on conflict (referee_id) do nothing;

  if found then
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_referrer, 'membership', 'membership',
      new.full_name || ' joined',
      'They signed up with ' || v_code || '. Your day pass follows once their first payment settles.'
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.credit_referral_on_first_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_referral public.referrals;
begin
  if new.status <> 'succeeded' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'succeeded' then
    return new;
  end if;

  update public.referrals
  set status = 'credited', credited_at = now()
  where referee_id = new.member_id and status = 'pending'
  returning * into v_referral;

  if found then
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_referral.referrer_id, 'membership', 'membership',
      'Your referral day pass is ready',
      split_part(v_referral.referee_name, ' ', 1) || '''s first payment went through, so the pass is now in your account.'
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_membership_renewals()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_membership record;
begin
  update public.memberships
  set status = 'expired', updated_at = now()
  where status = 'active' and not auto_renew and current_period_end <= now();

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'membership_renewal_webhook_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'membership_renewal_webhook_secret';

  if v_url is not null and v_secret is not null then
    for v_membership in
      select m.*
      from public.memberships m
      where m.status = 'active'
        and m.auto_renew
        and m.current_period_end <= now()
        and m.renewal_attempted_at is null
    loop
      update public.memberships set renewal_attempted_at = now() where member_id = v_membership.member_id;

      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('type', 'charge', 'record', to_jsonb(v_membership)),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 30000
      );
    end loop;
  end if;

  for v_membership in
    select m.*
    from public.memberships m
    where m.status = 'active'
      and m.plan = 'annual'
      and m.auto_renew
      and m.renewal_notice_sent_at is null
      and m.current_period_end between now() and now() + interval '30 days'
  loop
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_membership.member_id, 'membership', 'membership',
      'Your membership renews on ' || to_char(v_membership.current_period_end at time zone 'UTC', 'FMMonth FMDD, YYYY'),
      case when v_membership.pending_plan = 'monthly'
        then 'Your annual term ends then and you move to the monthly plan, $249.00 a month — manage it from Profile › Membership.'
        else 'Nothing to do unless you want to change the plan or the card — manage it from Profile › Membership.'
      end
    );

    if v_url is not null and v_secret is not null then
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('type', 'notice', 'record', to_jsonb(v_membership)),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 15000
      );
    end if;

    update public.memberships set renewal_notice_sent_at = now() where member_id = v_membership.member_id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_morning_notifications()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_partner_morning_digest()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_row record;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'partner_digest_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'partner_digest_webhook_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  -- Story 10.7 — un email por usuario con todos los lounges de su partner.
  for v_row in select * from public.partner_digest_batches((now() at time zone 'UTC')::date) loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'morning_digest',
        'partner_email', v_row.email,
        'partner_business_name', v_row.partner_name,
        'date', (now() at time zone 'UTC')::date,
        'lounges', v_row.lounges
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_scheduled_reports()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_report record;
  v_from date;
  v_to date := date '2025-09-09';
  v_csv text;
  v_next interval;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'admin_report_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'admin_report_webhook_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  for v_report in
    select * from public.scheduled_reports
    where enabled = true and next_run_at <= now()
  loop
    v_next := case v_report.cadence
      when 'daily' then interval '1 day'
      when 'weekly' then interval '7 days'
      else interval '30 days'
    end;
    v_from := v_to - (extract(day from v_next)::int - 1);

    v_csv := public.admin_generate_report_csv(v_report.dataset, v_from, v_to);

    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'report_name', v_report.name,
        'recipients', to_jsonb(v_report.recipients),
        'csv', v_csv
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );

    update public.scheduled_reports
      set last_run_at = now(), next_run_at = now() + v_next, updated_at = now()
      where id = v_report.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code (
  p_full_name text
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_initials text;
  v_candidate text;
  v_attempt integer := 0;
begin
  select coalesce(nullif(upper(string_agg(left(word, 1), '')), ''), 'LP')
  into v_initials
  from (
    select word
    from regexp_split_to_table(trim(coalesce(p_full_name, '')), '\s+') with ordinality as t(word, n)
    where word ~ '^[A-Za-z]'
    order by n
    limit 2
  ) initials;

  loop
    v_attempt := v_attempt + 1;
    v_candidate := v_initials || '-SOLEIL-' ||
      case when v_attempt <= 30
        then (10 + floor(random() * 90))::integer::text
        else (1000 + floor(random() * 9000))::integer::text
      end;
    exit when not exists (select 1 from public.profiles p where p.referral_code = v_candidate);
  end loop;

  return v_candidate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_profile_managed_columns()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.membership_status := 'inactive';
      new.referral_code := null;
      new.stripe_customer_id := null;
    else
      new.membership_status := old.membership_status;
      new.referral_code := old.referral_code;
      new.stripe_customer_id := old.stripe_customer_id;
    end if;
  end if;

  if new.referral_code is null then
    new.referral_code := public.generate_referral_code(new.full_name);
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.membership_change_quote (
  p_plan text
)
  RETURNS TABLE (
    kind         text,
    plan         text,
    term_start   timestamp with time zone,
    term_end     timestamp with time zone,
    charge_cents integer,
    credit_cents integer,
    credit_days  integer,
    due_cents    integer
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_current public.memberships;
  v_charge integer;
  v_total_days integer;
  v_credit_days integer;
  v_credit integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_plan not in ('monthly', 'annual') then
    raise exception 'Unknown plan %', p_plan;
  end if;

  v_charge := case p_plan when 'annual' then 240000 else 24900 end;

  select * into v_current
  from public.memberships m
  where m.member_id = v_uid and m.status = 'active';

  if not found then
    return query select
      'join'::text, p_plan, now(),
      now() + case p_plan when 'annual' then interval '1 year' else interval '1 month' end,
      v_charge, 0, 0, v_charge;
    return;
  end if;

  if v_current.plan = p_plan then
    raise exception 'Already on the % plan', p_plan;
  end if;
  if v_current.plan = 'annual' then
    raise exception 'Switching to monthly takes effect at the end of the current term';
  end if;

  v_total_days := greatest(1, round(extract(epoch from (v_current.current_period_end - v_current.current_period_start)) / 86400)::integer);
  v_credit_days := least(v_total_days, greatest(0, ceil(extract(epoch from (v_current.current_period_end - now())) / 86400)::integer));
  v_credit := round(24900::numeric * v_credit_days / v_total_days)::integer;

  return query select
    'upgrade'::text, p_plan, now(), now() + interval '1 year',
    v_charge, v_credit, v_credit_days, v_charge - v_credit;
end;
$function$;

CREATE OR REPLACE FUNCTION public.membership_visits_in_month (
  p_month date
)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select count(*)::integer
  from public.bookings b
  where b.member_id = (select auth.uid())
    and date_trunc('month', b.date) = date_trunc('month', p_month)
    and b.status in ('confirmed', 'in_progress', 'completed')
    and not exists (
      select 1 from public.payments p
      where p.booking_id = b.id and p.status = 'succeeded'
    )
    -- Pagada con un day pass de regalo: no gasta visita incluida
    -- (booking_coverage.sql).
    and not exists (
      select 1 from public.day_pass_redemptions r where r.booking_id = b.id
    );
$function$;

CREATE OR REPLACE FUNCTION public.my_referral_code()
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select referral_code into v_code from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_code is null then
    update public.profiles set updated_at = now() where id = v_uid returning referral_code into v_code;
  end if;

  return v_code;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_booking_confirmed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'booking_receipt_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'booking_receipt_webhook_secret';

  if v_url is null or v_secret is null then
    return new;
  end if;

  -- 15s, no los 5s por defecto: `send-booking-receipt` reintenta unos
  -- segundos si el pago de una tarjeta nueva todavía está 'pending' (el
  -- webhook de Stripe puede tardar en llegar, ver su comentario
  -- `findSettledPayment`) antes de mandar el correo — un timeout más corto
  -- cortaba la llamada a mitad de esa espera.
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 15000
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_booking_confirmed_in_app()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_partner_cancellation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_lounge_name text;
  v_updated_guest_count int;
  v_partner record;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_secret';

  if v_url is null or v_secret is null then
    return new;
  end if;

  select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

  select count(*)::int into v_updated_guest_count
  from public.bookings b
  where b.lounge_id = new.lounge_id and b.date = new.date and b.status <> 'cancelled';

  for v_partner in
    -- Story 10.7 — cada usuario activo del partner del lounge.
    select r.email as contact_email, r.partner_name as business_name
    from public.partner_notification_recipients(new.lounge_id) r
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'cancellation',
        'record', to_jsonb(new),
        'lounge_name', v_lounge_name,
        'updated_guest_count', v_updated_guest_count,
        'partner_email', v_partner.contact_email,
        'partner_business_name', v_partner.business_name
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
  end loop;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_partner_new_booking()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_lounge_name text;
  v_partner record;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_secret';

  if v_url is null or v_secret is null then
    return new;
  end if;

  select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

  for v_partner in
    -- Story 10.7 — cada usuario activo del partner del lounge.
    select r.email as contact_email, r.partner_name as business_name
    from public.partner_notification_recipients(new.lounge_id) r
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'new_booking',
        'record', to_jsonb(new),
        'lounge_name', v_lounge_name,
        'partner_email', v_partner.contact_email,
        'partner_business_name', v_partner.business_name
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
  end loop;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.open_support_ticket_for_no_show()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.partner_context()
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
declare
  v_member public.partner_members;
  v_partner_name text;
  v_partner_status text;
  v_lounges jsonb;
  v_selected text;
begin
  select * into v_member from public.partner_members where user_id = (select auth.uid());
  if v_member.id is null then
    return null;
  end if;

  select p.name, p.status into v_partner_name, v_partner_status from public.partners p where p.id = v_member.partner_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'neighborhood', l.neighborhood,
    'content_status', l.content_status
  ) order by l.name, l.id), '[]'::jsonb)
  into v_lounges
  from public.lounges l
  where l.id in (select public.partner_lounge_ids());

  if v_member.selected_lounge_id is not null
     and v_member.selected_lounge_id in (select public.partner_lounge_ids()) then
    v_selected := v_member.selected_lounge_id;
  else
    v_selected := v_lounges->0->>'id';
  end if;

  return jsonb_build_object(
    'partner', jsonb_build_object('id', v_member.partner_id, 'name', v_partner_name, 'status', v_partner_status),
    'user', jsonb_build_object('first_name', v_member.first_name, 'last_name', v_member.last_name, 'suspended', v_member.suspended_at is not null),
    'lounges', v_lounges,
    'selected_lounge_id', v_selected,
    'all_lounges', v_member.all_lounges and jsonb_array_length(v_lounges) > 0
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_digest_batches (
  p_date date
)
  RETURNS TABLE (
    email        text,
    partner_name text,
    lounges      jsonb
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    m.email,
    p.name,
    (
      select coalesce(jsonb_agg(jsonb_build_object(
        'lounge_id', l.id,
        'lounge_name', l.name,
        'guest_count', (
          select count(*)::int from public.bookings b
          where b.lounge_id = l.id and b.date = p_date and b.status <> 'cancelled'
        ),
        'guests', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', coalesce(prof.full_name, split_part(u.email::text, '@', 1)),
            'slot_time', b.slot_time,
            'status', b.status
          ) order by to_timestamp(b.slot_time, 'HH12:MI AM')::time, b.created_at)
          from public.bookings b
          left join auth.users u on u.id = b.member_id
          left join public.profiles prof on prof.id = b.member_id
          where b.lounge_id = l.id and b.date = p_date and b.status <> 'cancelled'
        ), '[]'::jsonb)
      ) order by l.name, l.id), '[]'::jsonb)
      from public.lounges l
      where l.partner_id = p.id and l.content_status in ('live', 'draft')
    )
  from public.partners p
  join public.partner_members m on m.partner_id = p.id and m.user_id is not null and m.suspended_at is null
  where p.status = 'active'
    and exists (select 1 from public.lounges l where l.partner_id = p.id)
  order by p.name, m.email;
$function$;

CREATE OR REPLACE FUNCTION public.partner_lounge_ids()
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select l.id
  from public.partner_members m
  join public.partners p on p.id = m.partner_id and p.status = 'active'
  join public.lounges l on l.partner_id = p.id
  where m.user_id = (select auth.uid()) and m.suspended_at is null
  order by l.id;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_default_representative()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.partners p set representative_id = new.id, updated_at = now()
  where p.id = new.partner_id and p.representative_id is null;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_guard_issued_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is not null
     and not public.has_role('admin')
     and (new.email is distinct from old.email
          or new.partner_id is distinct from old.partner_id
          or new.user_id is distinct from old.user_id
          or new.suspended_at is distinct from old.suspended_at) then
    raise exception 'The work email is issued by En Soleil and cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_keep_representative()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (select 1 from public.partners p where p.id = old.partner_id and p.representative_id = old.id)
     and exists (select 1 from public.partner_members m where m.partner_id = old.partner_id and m.id <> old.id) then
    raise exception 'Choose a new representative before deleting this user';
  end if;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_require_new_email()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (select 1 from auth.users u where lower(u.email) = lower(trim(new.email))) then
    raise exception '% is already in use', lower(trim(new.email));
  end if;
  new.email := lower(trim(new.email));
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_notification_recipients (
  p_lounge_id text
)
  RETURNS TABLE (
    email        text,
    partner_name text,
    lounge_name  text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select m.email, p.name, l.name
  from public.lounges l
  join public.partners p on p.id = l.partner_id and p.status = 'active'
  join public.partner_members m on m.partner_id = p.id
  where l.id = p_lounge_id and m.user_id is not null and m.suspended_at is null
  order by m.email;
$function$;

CREATE OR REPLACE FUNCTION public.partner_select_lounge (
  p_lounge_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if p_lounge_id is null then
    update public.partner_members set all_lounges = true where user_id = (select auth.uid());
    return;
  end if;
  if p_lounge_id not in (select public.partner_lounge_ids()) then
    raise exception 'That lounge is not one of your lounges';
  end if;
  update public.partner_members set selected_lounge_id = p_lounge_id, all_lounges = false
  where user_id = (select auth.uid());
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_undo_booking_status (
  p_booking_id uuid
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.schedule_membership_plan_change (
  p_plan text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_plan <> 'monthly' then
    raise exception 'Only the switch to monthly is scheduled — annual takes effect straight away';
  end if;

  update public.memberships
  set pending_plan = 'monthly', auto_renew = true, updated_at = now()
  where member_id = v_uid and status = 'active' and plan = 'annual';

  if not found then
    raise exception 'No active annual membership';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seed_sample_notifications()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_membership_auto_renew (
  p_auto_renew boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_end timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Sin auto-renovación no habrá término siguiente: un cambio de plan
  -- programado deja de tener sentido.
  update public.memberships
  set auto_renew = p_auto_renew,
      pending_plan = case when p_auto_renew then pending_plan else null end,
      updated_at = now()
  where member_id = v_uid and status = 'active'
  returning current_period_end into v_end;

  if not found then
    raise exception 'No active membership';
  end if;

  if not p_auto_renew then
    update public.bookings
    set status = 'cancelled', cancelled_at = now(), cancellation_fee_cents = 0, updated_at = now()
    where member_id = v_uid
      and status in ('confirmed', 'waitlisted')
      and date > (v_end at time zone 'UTC')::date;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.settle_checkout_session (
  p_session_id        text,
  p_outcome           text,
  p_payment_intent_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if p_outcome not in ('succeeded', 'failed') then
    raise exception 'Invalid outcome %', p_outcome;
  end if;

  update public.payments p
    set status = p_outcome,
        stripe_payment_intent_id = coalesce(p_payment_intent_id, p.stripe_payment_intent_id),
        updated_at = now()
    where p.stripe_checkout_session_id = p_session_id
      and p.status = 'pending';
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_membership_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'DELETE' then
    update public.profiles set membership_status = 'inactive' where id = old.member_id;
    return old;
  end if;

  update public.profiles
  set membership_status = case when new.status = 'active' then 'active' else 'inactive' end
  where id = new.member_id;
  return new;
end;
$function$;

CREATE TRIGGER cancel_booking_of_failed_payment
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (((new.status = 'failed'::text) AND (old.status IS DISTINCT FROM 'failed'::text) AND (new.booking_id IS NOT NULL)))
  EXECUTE FUNCTION public.cancel_booking_of_failed_payment();

REVOKE ALL ON FUNCTION "public"."cancel_booking_of_failed_payment"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."cancel_booking_of_failed_payment"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."settle_checkout_session"(text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."settle_checkout_session"(text, text, text) TO "postgres", "service_role";
