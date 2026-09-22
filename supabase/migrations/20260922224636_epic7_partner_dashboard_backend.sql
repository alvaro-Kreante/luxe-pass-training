SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."dispatch_account_deletions"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."dispatch_account_deletions"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."dispatch_morning_notifications"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."dispatch_morning_notifications"() FROM "authenticated";

CREATE TABLE "public"."partner_lounges" (
  "partner_id" uuid                     NOT NULL,
  "lounge_id"  text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "partner_lounges_pkey" PRIMARY KEY (partner_id, lounge_id)
);

ALTER TABLE "public"."partner_lounges"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."partners" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"       uuid                     NOT NULL,
  "business_name" text                     NOT NULL,
  "contact_email" text                     NOT NULL,
  "contact_phone" text                     NOT NULL DEFAULT ''::text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "partners_pkey" PRIMARY KEY (id),
  CONSTRAINT "partners_user_id_key" UNIQUE (user_id)
);

ALTER TABLE "public"."partners"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_roles" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "role"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_roles_role_check" CHECK ((role = ANY (ARRAY['partner'::text, 'admin'::text]))),
  CONSTRAINT "user_roles_user_id_role_key" UNIQUE (user_id, ROLE)
);

ALTER TABLE "public"."user_roles"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bookings"
  ADD COLUMN "no_show_reason" text;

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

  for v_row in
    select
      p.contact_email,
      p.business_name,
      pl.lounge_id,
      l.name as lounge_name,
      count(b.id) filter (where b.status <> 'cancelled')::int as guest_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', coalesce(prof.full_name, split_part(u.email::text, '@', 1)),
            'slot_time', b.slot_time,
            'status', b.status
          )
          order by b.slot_time
        ) filter (where b.status <> 'cancelled'),
        '[]'::jsonb
      ) as guests
    from public.partner_lounges pl
    join public.partners p on p.id = pl.partner_id
    join public.lounges l on l.id = pl.lounge_id
    left join public.bookings b
      on b.lounge_id = pl.lounge_id and b.date = (now() at time zone 'UTC')::date
    left join auth.users u on u.id = b.member_id
    left join public.profiles prof on prof.id = b.member_id
    group by p.contact_email, p.business_name, pl.lounge_id, l.name
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'morning_digest',
        'partner_email', v_row.contact_email,
        'partner_business_name', v_row.business_name,
        'lounge_id', v_row.lounge_id,
        'lounge_name', v_row.lounge_name,
        'date', (now() at time zone 'UTC')::date,
        'guest_count', v_row.guest_count,
        'guests', v_row.guests
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

CREATE OR REPLACE FUNCTION public.has_role (
  p_role text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = p_role
  );
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
    select p.contact_email, p.business_name
    from public.partner_lounges pl
    join public.partners p on p.id = pl.partner_id
    where pl.lounge_id = new.lounge_id
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
    select p.contact_email, p.business_name
    from public.partner_lounges pl
    join public.partners p on p.id = pl.partner_id
    where pl.lounge_id = new.lounge_id
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

CREATE OR REPLACE FUNCTION public.partner_analytics_summary (
  p_from date,
  p_to   date
)
  RETURNS TABLE (
    bookings          integer,
    day_pass_visits   integer,
    membership_visits integer,
    no_shows          integer,
    cancellations     integer
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
      )::int,
      count(*) filter (where b.no_show = true)::int,
      count(*) filter (where b.status = 'cancelled')::int
    from public.bookings b
    where b.lounge_id in (select public.partner_lounge_ids())
      and b.date between p_from and p_to;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_bookings_by_day (
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
  return query
    select d.day, count(b.id)::int
    from generate_series(p_from, p_to, interval '1 day') as d(day)
    left join public.bookings b
      on b.date = d.day and b.lounge_id in (select public.partner_lounge_ids())
    group by d.day
    order by d.day;
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

CREATE OR REPLACE FUNCTION public.partner_lounge_ids()
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select pl.lounge_id
  from public.partner_lounges pl
  join public.partners p on p.id = pl.partner_id
  where p.user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.partner_repeat_guests()
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
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      count(*)::int,
      min(b.date),
      max(b.date),
      sum(
        case
          when exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
            then 75.00
          else 38.00
        end
      )::numeric(10, 2)
    from public.bookings b
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.lounge_id in (select public.partner_lounge_ids())
      and b.status <> 'cancelled'
      and b.no_show = false
    group by b.member_id, p.full_name, u.email
    order by count(*) desc;
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

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_no_show_reason_check" CHECK ((no_show_reason = ANY (ARRAY['never-arrived'::text, 'arrived-after-window'::text, 'something-else'::text])));

ALTER TABLE "public"."partner_lounges"
  ADD CONSTRAINT "partner_lounges_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

ALTER TABLE "public"."partner_lounges"
  ADD CONSTRAINT "partner_lounges_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;

ALTER TABLE "public"."partners"
  ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_roles"
  ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TRIGGER booking_cancelled_notify_partner
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_partner_cancellation();

CREATE TRIGGER booking_confirmed_notify_partner
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_partner_new_booking();

CREATE POLICY "partner select lounge bookings" ON "public"."bookings"
  FOR SELECT
  TO "authenticated"
  USING ((lounge_id IN ( SELECT public.partner_lounge_ids() AS partner_lounge_ids)));

CREATE POLICY "select own partner lounges" ON "public"."partner_lounges"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.partners p
  WHERE ((p.id = partner_lounges.partner_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "select own partner account" ON "public"."partners"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "select own roles" ON "public"."user_roles"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

REVOKE ALL ON FUNCTION "public"."dispatch_partner_morning_digest"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."dispatch_partner_morning_digest"() TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."has_role"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."notify_partner_cancellation"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."notify_partner_cancellation"() TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."notify_partner_new_booking"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."notify_partner_new_booking"() TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_analytics_summary"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_bookings_by_day"(date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_checkin_booking"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_guest_list"(text, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_lounge_ids"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_repeat_guests"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_report_no_show"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."partner_lounges" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."partners" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_roles" TO "anon", "authenticated", "postgres", "service_role";

SELECT cron.schedule_in_database('send-partner-morning-digest', '30 6 * * *', 'select public.dispatch_partner_morning_digest();', 'postgres', NULL, true);
