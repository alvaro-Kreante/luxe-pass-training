SET local check_function_bodies = off;

CREATE TABLE "public"."scheduled_reports" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "dataset"     text                     NOT NULL,
  "recipients"  text[]                   NOT NULL,
  "cadence"     text                     NOT NULL,
  "enabled"     boolean                  NOT NULL DEFAULT true,
  "created_by"  uuid,
  "last_run_at" timestamp with time zone,
  "next_run_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "scheduled_reports_cadence_check" CHECK ((cadence = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))),
  CONSTRAINT "scheduled_reports_dataset_check" CHECK ((dataset = ANY (ARRAY['bookings'::text, 'members'::text, 'revenue-by-partner'::text, 'no-shows-cancellations'::text]))),
  CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."scheduled_reports"
  ENABLE ROW LEVEL SECURITY;

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
  if not public.has_role('admin') then
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
  if not public.has_role('admin') then
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
  if not public.has_role('admin') then
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
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  if p_dataset = 'bookings' then
    select 'Reference,Member,Email,Lounge,City,Date,Time,Status,Amount' || chr(10) || coalesce(string_agg(
      admin_csv_row(array[confirmation_code, member_name, member_email, lounge_name, city, date::text, slot_time, status, (amount_charged_cents / 100.0)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_bookings(p_from, p_to);
  elsif p_dataset = 'members' then
    select 'Name,Email,Phone,Status,Member since' || chr(10) || coalesce(string_agg(
      admin_csv_row(array[full_name, email, coalesce(phone, ''), membership_status, member_since::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_members();
  elsif p_dataset = 'revenue-by-partner' then
    select 'Lounge,Bookings,Gross revenue' || chr(10) || coalesce(string_agg(
      admin_csv_row(array[lounge_name, bookings::text, (gross_revenue_cents / 100.0)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_revenue_by_partner(p_from, p_to);
  elsif p_dataset = 'no-shows-cancellations' then
    select 'Reference,Member,Lounge,Date,Status,Fee' || chr(10) || coalesce(string_agg(
      admin_csv_row(array[confirmation_code, member_name, lounge_name, date::text, status, (fee_cents / 100.0)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_no_shows_cancellations(p_from, p_to);
  else
    raise exception 'Unknown dataset %', p_dataset;
  end if;

  return v_csv;
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

CREATE OR REPLACE FUNCTION public.admin_network_summary (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    bookings   integer,
    attended   integer,
    no_shows   integer,
    cancelled  integer,
    joined     integer,
    left_count integer
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
      (select count(*)::int from public.profiles p where p.deleted_at is not null and p.deleted_at::date between p_from and p_to);
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
  if not public.has_role('admin') then
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

ALTER TABLE "public"."scheduled_reports"
  ADD CONSTRAINT "scheduled_reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

CREATE POLICY "admin manages scheduled reports" ON "public"."scheduled_reports"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('admin'::text))
  WITH CHECK (public.has_role('admin'::text));

GRANT EXECUTE ON FUNCTION "public"."admin_amenity_demand"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_bookings_by_day"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_city_demand"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_csv_row"(text[]) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_export_bookings"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_export_members"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_export_no_shows_cancellations"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_generate_report_csv"(text, date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_lounge_popularity"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_network_summary"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_revenue_by_partner"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."dispatch_scheduled_reports"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."dispatch_scheduled_reports"() TO "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."scheduled_reports" TO "anon", "authenticated", "postgres", "service_role";

SELECT cron.schedule_in_database('dispatch-scheduled-reports', '*/15 * * * *', 'select public.dispatch_scheduled_reports();', 'postgres', NULL, true);
