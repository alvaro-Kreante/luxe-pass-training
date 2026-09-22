SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."dispatch_booking_reminders"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."dispatch_booking_reminders"() FROM "authenticated";

CREATE TABLE "public"."member_favorite_lounges" (
  "member_id"  uuid                     NOT NULL,
  "lounge_id"  text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "member_favorite_lounges_pkey" PRIMARY KEY (member_id, lounge_id)
);

ALTER TABLE "public"."member_favorite_lounges"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "member_id"  uuid                     NOT NULL,
  "category"   text                     NOT NULL,
  "icon"       text                     NOT NULL,
  "title"      text                     NOT NULL,
  "body"       text                     NOT NULL,
  "read_at"    timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_category_check" CHECK ((category = ANY (ARRAY['bookings'::text, 'lounges'::text, 'offers'::text, 'membership'::text]))),
  CONSTRAINT "notifications_icon_check" CHECK ((icon = ANY (ARRAY['morning'::text, 'birthday'::text, 'booking'::text, 'lounge'::text, 'membership'::text, 'offer'::text]))),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bookings"
  ADD COLUMN "morning_notification_sent_at" timestamp WITH time zone;

ALTER TABLE "public"."bookings"
  ADD COLUMN "cancellation_fee_cents" integer;

ALTER TABLE "public"."bookings"
  ADD COLUMN "cancelled_at" timestamp WITH time zone;

ALTER TABLE "public"."profiles"
  ADD COLUMN "membership_status" text NOT NULL DEFAULT 'active'::text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "preferred_amenities" text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE "public"."profiles"
  ADD COLUMN "privacy_personalized_recommendations" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."profiles"
  ADD COLUMN "privacy_share_with_lounge" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."profiles"
  ADD COLUMN "privacy_product_research" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."profiles"
  ADD COLUMN "privacy_marketing_analytics" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."profiles"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

CREATE OR REPLACE FUNCTION public.cancel_booking (
  p_booking_id uuid,
  p_today      date
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_account_deletions()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_profile record;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'account_deletion_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'account_deletion_webhook_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  for v_profile in
    select p.id
    from public.profiles p
    where p.deleted_at is not null
      and p.deleted_at <= now() - interval '30 days'
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('member_id', v_profile.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
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

CREATE OR REPLACE FUNCTION public.reception_report_no_show (
  p_lounge_id         text,
  p_date              date,
  p_confirmation_code text
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
$function$;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
  RETURNS public.profiles
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_member_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.bookings b
    set
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_fee_cents = case
        when b.status = 'confirmed' and greatest(b.date - current_date, 0) * 24 < 24 then 3500
        else null
      end,
      updated_at = now()
    where b.member_id = v_member_id
      and b.status in ('confirmed', 'waitlisted');

  update public.profiles p
    set deleted_at = now(), updated_at = now()
    where p.id = v_member_id
    returning p.* into v_profile;

  return v_profile;
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

ALTER TABLE "public"."member_favorite_lounges"
  ADD CONSTRAINT "member_favorite_lounges_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

ALTER TABLE "public"."member_favorite_lounges"
  ADD CONSTRAINT "member_favorite_lounges_member_id_fkey" FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_member_id_fkey" FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_membership_status_check" CHECK ((membership_status = ANY (ARRAY['active'::text, 'inactive'::text])));

CREATE TRIGGER booking_confirmed_notify_in_app
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_confirmed_in_app();

CREATE TRIGGER profile_created_seed_notifications
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_sample_notifications();

CREATE POLICY "delete own favorite lounges" ON "public"."member_favorite_lounges"
  FOR DELETE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id));

CREATE POLICY "insert own favorite lounges" ON "public"."member_favorite_lounges"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));

CREATE POLICY "select own favorite lounges" ON "public"."member_favorite_lounges"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id));

CREATE POLICY "select own notifications" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id));

CREATE POLICY "update own notifications" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = member_id));

GRANT EXECUTE ON FUNCTION "public"."cancel_booking"(uuid, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."dispatch_account_deletions"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."dispatch_account_deletions"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."dispatch_morning_notifications"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."dispatch_morning_notifications"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."notify_booking_confirmed_in_app"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."notify_booking_confirmed_in_app"() TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."request_account_deletion"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."seed_sample_notifications"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."seed_sample_notifications"() TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."member_favorite_lounges" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "anon", "authenticated", "postgres", "service_role";

SELECT cron.schedule_in_database('dispatch-account-deletions', '0 7 * * *', 'select public.dispatch_account_deletions();', 'postgres', NULL, true);

SELECT cron.schedule_in_database('send-morning-notifications', '*/15 * * * *', 'select public.dispatch_morning_notifications();', 'postgres', NULL, true);
