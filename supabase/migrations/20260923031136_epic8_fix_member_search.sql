SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_search_members (
  p_query text
)
  RETURNS TABLE (
    id                uuid,
    full_name         text,
    email             text,
    phone             text,
    membership_status text,
    deleted_at        timestamp with time zone,
    member_since      timestamp with time zone,
    open_cases_count  integer,
    last_visit_date   date,
    last_visit_lounge text
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

  if v_trimmed = '' then
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

CREATE OR REPLACE FUNCTION public.partner_checkin_booking (
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
$function$;

CREATE OR REPLACE FUNCTION public.partner_guest_list (
  p_lounge_id text,
  p_date      date
)
  RETURNS TABLE (
    id                uuid,
    confirmation_code text,
    member_name       text,
    member_email      text,
    member_phone      text,
    band              text,
    slot_time         text,
    status            text,
    checked_in_at     timestamp with time zone,
    no_show           boolean,
    no_show_reason    text,
    special_requests  text,
    created_at        timestamp with time zone,
    is_day_pass       boolean,
    visit_number      integer,
    emergency_contact text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.partner_report_no_show (
  p_booking_id uuid,
  p_reason     text
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;
