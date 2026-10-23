SET local check_function_bodies = off;

DROP FUNCTION "public"."partner_guest_history"(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_lounge_reviews (
  p_lounge_id text
)
  RETURNS TABLE (
    id                uuid,
    member_id         uuid,
    author_name       text,
    plan              text,
    visited_on        date,
    confirmation_code text,
    rating            smallint,
    body              text,
    mentions          text[]
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select
      r.id,
      r.member_id,
      coalesce(nullif(trim(p.full_name), ''), 'Member'),
      m.plan,
      b.date,
      b.confirmation_code,
      r.rating,
      r.body,
      r.mentions
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    left join public.profiles p on p.id = r.member_id
    left join public.memberships m on m.member_id = r.member_id and m.status = 'active'
    where r.lounge_id = p_lounge_id
    order by b.date desc, r.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.lounge_reviews (
  p_lounge_id text
)
  RETURNS TABLE (
    id          uuid,
    author_name text,
    plan        text,
    visited_on  date,
    rating      smallint,
    body        text,
    mentions    text[]
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not exists (
    select 1 from public.lounges l
    where l.id = p_lounge_id
      and (l.content_status = 'live' or public.has_role('admin') or l.id in (select public.partner_lounge_ids()))
  ) then
    return;
  end if;

  return query
    select
      r.id,
      public.review_author_short(p.full_name),
      m.plan,
      b.date,
      r.rating,
      r.body,
      r.mentions
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    left join public.profiles p on p.id = r.member_id
    left join public.memberships m on m.member_id = r.member_id and m.status = 'active'
    where r.lounge_id = p_lounge_id
    order by b.date desc, r.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_analytics_summary (
  p_from      date,
  p_to        date,
  p_lounge_id text DEFAULT NULL::text
)
  RETURNS TABLE (
    bookings               integer,
    day_pass_visits        integer,
    membership_visits      integer,
    no_shows               integer,
    cancellations          integer,
    day_pass_revenue_cents integer,
    no_show_fee_cents      integer,
    complimentary_visits   integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  return query
    select
      count(*)::int,
      count(*) filter (
        where b.status <> 'cancelled' and b.no_show = false
          and exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      )::int,
      count(*) filter (
        where b.status <> 'cancelled' and b.no_show = false
          and not exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
          and not exists (select 1 from public.day_pass_redemptions r where r.booking_id = b.id)
      )::int,
      count(*) filter (where b.no_show = true)::int,
      count(*) filter (where b.status = 'cancelled')::int,
      coalesce(sum(
        (select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      ) filter (where b.status <> 'cancelled' and b.no_show = false), 0)::int,
      coalesce(sum(b.cancellation_fee_cents) filter (where b.no_show = true), 0)::int,
      count(*) filter (
        where b.status <> 'cancelled' and b.no_show = false
          and not exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
          and exists (select 1 from public.day_pass_redemptions r where r.booking_id = b.id)
      )::int
    from public.bookings b
    where b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
      and b.date between p_from and p_to;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_bookings_by_day (
  p_from      date,
  p_to        date,
  p_lounge_id text DEFAULT NULL::text
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
  return query
    select d.day::date, count(b.id)::int
    from generate_series(p_from, p_to, interval '1 day') as d(day)
    left join public.bookings b
      on b.date = d.day::date and b.lounge_id in (select public.partner_lounge_ids())
        and (p_lounge_id is null or b.lounge_id = p_lounge_id)
    group by d.day
    order by d.day;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_guest_history (
  p_member_id uuid,
  p_lounge_id text DEFAULT NULL::text
)
  RETURNS TABLE (
    booking_id        uuid,
    lounge_name       text,
    date              date,
    slot_time         text,
    status            text,
    checked_in        boolean,
    no_show           boolean,
    paid_cents        integer,
    confirmation_code text,
    review_rating     smallint,
    review_body       text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  return query
    select
      b.id,
      l.name,
      b.date,
      b.slot_time,
      b.status,
      b.checked_in_at is not null,
      b.no_show,
      coalesce((select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded'), 0)::int,
      b.confirmation_code,
      r.rating,
      r.body
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    left join public.reviews r on r.booking_id = b.id
    where b.member_id = p_member_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
    order by b.date desc, b.slot_time;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_repeat_guests (
  p_lounge_id text DEFAULT NULL::text
)
  RETURNS TABLE (
    member_id    uuid,
    member_name  text,
    member_email text,
    visits       integer,
    first_visit  date,
    last_visit   date,
    attributed   numeric
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  return query
    select
      b.member_id,
      -- PRIV-01: sin "Share your details with the lounge", ni nombre ni email.
      case when coalesce(p.privacy_share_with_lounge, true) then coalesce(p.full_name, split_part(u.email::text, '@', 1)) else 'Private guest' end,
      case when coalesce(p.privacy_share_with_lounge, true) then u.email::text end,
      count(*)::int,
      min(b.date),
      max(b.date),
      coalesce(sum(
        (select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      ), 0)::numeric(10, 2) / 100
    from public.bookings b
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
      and b.status <> 'cancelled'
      and b.no_show = false
    group by b.member_id, p.full_name, u.email, p.privacy_share_with_lounge
    order by count(*) desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_reviews (
  p_lounge_id text DEFAULT NULL::text
)
  RETURNS TABLE (
    id                uuid,
    author_name       text,
    plan              text,
    visited_on        date,
    lounge_name       text,
    confirmation_code text,
    rating            smallint,
    body              text,
    mentions          text[]
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  return query
    select
      r.id,
      public.review_author_short(p.full_name),
      m.plan,
      b.date,
      l.name,
      b.confirmation_code,
      r.rating,
      r.body,
      r.mentions
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    join public.lounges l on l.id = r.lounge_id
    left join public.profiles p on p.id = r.member_id
    left join public.memberships m on m.member_id = r.member_id and m.status = 'active'
    where r.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or r.lounge_id = p_lounge_id)
    order by b.date desc, r.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_lounge_rating()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_lounge_id text := coalesce(new.lounge_id, old.lounge_id);
begin
  update public.lounges l
  set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.lounge_id = v_lounge_id), 0),
      review_count = (select count(*) from public.reviews r where r.lounge_id = v_lounge_id)
  where l.id = v_lounge_id;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_author_short (
  p_full_name text
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select trim(
    split_part(coalesce(nullif(trim(p_full_name), ''), 'Member'), ' ', 1)
    || coalesce(' ' || nullif(left(split_part(trim(p_full_name), ' ', 2), 1), '') || '.', '')
  );
$function$;

CREATE OR REPLACE FUNCTION public.set_review_lounge()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.lounge_id := (select b.lounge_id from public.bookings b where b.id = new.booking_id);
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_lounge_reviews"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."admin_lounge_reviews"(text) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_guest_history"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."partner_reviews"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."partner_reviews"(text) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_author_short"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
