SET local check_function_bodies = off;

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

GRANT EXECUTE ON FUNCTION "public"."admin_get_ticket"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_list_support_tickets"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_ticket_counts"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
