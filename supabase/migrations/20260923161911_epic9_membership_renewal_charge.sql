SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."apply_membership_payment"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."apply_membership_payment"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."create_referral_from_signup"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."create_referral_from_signup"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."credit_referral_on_first_payment"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."credit_referral_on_first_payment"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."dispatch_membership_renewals"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."dispatch_membership_renewals"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."generate_referral_code"(text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."guard_profile_managed_columns"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."guard_profile_managed_columns"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."membership_change_quote"(text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."my_referral_code"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."set_membership_auto_renew"(boolean) FROM "anon";

REVOKE ALL ON FUNCTION "public"."sync_profile_membership_status"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."sync_profile_membership_status"() FROM "authenticated";

ALTER TABLE "public"."memberships"
  ADD COLUMN "pending_plan" text;

ALTER TABLE "public"."memberships"
  ADD COLUMN "renewal_attempted_at" timestamp WITH time zone;

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

ALTER TABLE "public"."memberships"
  ADD CONSTRAINT "memberships_pending_plan_check" CHECK ((pending_plan = ANY (ARRAY['monthly'::text, 'annual'::text])));

REVOKE ALL ON FUNCTION "public"."cancel_membership_plan_change"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."cancel_membership_plan_change"() TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."schedule_membership_plan_change"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."schedule_membership_plan_change"(text) TO "authenticated", "postgres", "service_role";
