SET local check_function_bodies = off;

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
  if not public.has_role('admin') then
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
