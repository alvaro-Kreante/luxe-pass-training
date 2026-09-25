SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."cancel_membership_plan_change"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."schedule_membership_plan_change"(text) FROM "anon";

CREATE TABLE "public"."day_pass_redemptions" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "member_id"   uuid                     NOT NULL,
  "booking_id"  uuid                     NOT NULL,
  "source"      text                     NOT NULL,
  "redeemed_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "day_pass_redemptions_booking_id_key" UNIQUE (booking_id),
  CONSTRAINT "day_pass_redemptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "day_pass_redemptions_source_check" CHECK ((source = ANY (ARRAY['referral'::text, 'birthday'::text])))
);

ALTER TABLE "public"."day_pass_redemptions"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.booking_coverage (
  p_date date
)
  RETURNS TABLE (
    kind              text,
    plan              text,
    visits_used       integer,
    visits_included   integer,
    credit_source     text,
    credits_available integer,
    renewal_date      timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  return query select * from public.booking_coverage_for(auth.uid(), p_date);
end;
$function$;

CREATE OR REPLACE FUNCTION public.booking_coverage_for (
  p_member_id uuid,
  p_date      date
)
  RETURNS TABLE (
    kind              text,
    plan              text,
    visits_used       integer,
    visits_included   integer,
    credit_source     text,
    credits_available integer,
    renewal_date      timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_membership public.memberships;
  v_visits integer;
  v_birthday boolean := false;
  v_referral_earned integer := 0;
  v_referral_used integer := 0;
  v_referral_left integer := 0;
begin
  select count(*)::integer into v_visits
  from public.bookings b
  where b.member_id = p_member_id
    and date_trunc('month', b.date) = date_trunc('month', p_date)
    and b.status in ('confirmed', 'in_progress', 'completed')
    and not exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'succeeded')
    and not exists (select 1 from public.day_pass_redemptions r where r.booking_id = b.id);

  select * into v_membership
  from public.memberships m
  where m.member_id = p_member_id and m.status = 'active';

  if not found
     or (not v_membership.auto_renew and p_date > (v_membership.current_period_end at time zone 'UTC')::date) then
    return query select 'none'::text, null::text, v_visits, 8, null::text, 0, null::timestamptz;
    return;
  end if;

  select exists (
    select 1 from public.profiles pr
    where pr.id = p_member_id and pr.birth_month = extract(month from p_date)::integer
  ) and not exists (
    select 1
    from public.day_pass_redemptions r
    join public.bookings b on b.id = r.booking_id
    where r.member_id = p_member_id
      and r.source = 'birthday'
      and b.status <> 'cancelled'
      and extract(year from b.date) = extract(year from p_date)
  ) into v_birthday;

  select
    (select count(*) from public.referrals rf where rf.referrer_id = p_member_id and rf.status = 'credited')
    + (select count(*) from public.referrals rf where rf.referee_id = p_member_id and rf.status = 'credited')
  into v_referral_earned;

  select count(*)::integer into v_referral_used
  from public.day_pass_redemptions r
  join public.bookings b on b.id = r.booking_id
  where r.member_id = p_member_id and r.source = 'referral' and b.status <> 'cancelled';

  v_referral_left := greatest(0, v_referral_earned - v_referral_used);

  return query select
    case
      when v_birthday or v_referral_left > 0 then 'day_pass_credit'
      when v_visits < 8 then 'membership'
      else 'none'
    end,
    v_membership.plan,
    v_visits,
    8,
    case when v_birthday then 'birthday' when v_referral_left > 0 then 'referral' end,
    (case when v_birthday then 1 else 0 end) + v_referral_left,
    v_membership.current_period_end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_booking (
  p_lounge_id        text,
  p_date             date,
  p_band             text,
  p_slot_time        text,
  p_special_requests text DEFAULT ''::text,
  p_payment_id       uuid DEFAULT NULL::uuid
)
  RETURNS TABLE (
    id               uuid,
    status           text,
    date             date,
    band             text,
    slot_time        text,
    special_requests text,
    created_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_member_id uuid := auth.uid();
  v_seats smallint;
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

  select la.seats_left into v_seats
  from public.lounge_availability la
  where la.lounge_id = p_lounge_id and la.date = p_date and la.band = p_band
  for update;

  if v_seats is null then
    raise exception 'No availability window for % on % (%)', p_lounge_id, p_date, p_band;
  end if;

  if v_seats <= 0 then
    return;
  end if;

  update public.lounge_availability la
    set seats_left = la.seats_left - 1, updated_at = now()
    where la.lounge_id = p_lounge_id and la.date = p_date and la.band = p_band;

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

ALTER TABLE "public"."day_pass_redemptions"
  ADD CONSTRAINT "day_pass_redemptions_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE "public"."day_pass_redemptions"
  ADD CONSTRAINT "day_pass_redemptions_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX day_pass_redemptions_member_id_idx ON public.day_pass_redemptions USING btree (member_id);

CREATE POLICY "select own day pass redemptions" ON "public"."day_pass_redemptions"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id));

REVOKE ALL ON FUNCTION "public"."booking_coverage"(date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."booking_coverage"(date) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."booking_coverage_for"(uuid, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."booking_coverage_for"(uuid, date) TO "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."day_pass_redemptions" TO "anon", "authenticated", "postgres", "service_role";
