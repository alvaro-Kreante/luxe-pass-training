SET local check_function_bodies = off;

CREATE EXTENSION "pg_cron";

ALTER TABLE "public"."bookings"
  ADD COLUMN "checked_in_at" timestamp WITH time zone;

ALTER TABLE "public"."bookings"
  ADD COLUMN "no_show" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."bookings"
  ADD COLUMN "reminder_sent_at" timestamp WITH time zone;

ALTER TABLE "public"."profiles"
  ADD COLUMN "emergency_contact_name" text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "emergency_contact_relation" text;

ALTER TABLE "public"."profiles"
  ADD COLUMN "emergency_contact_phone" text;

CREATE OR REPLACE FUNCTION public.booking_arrival_at (
  p_date      date,
  p_slot_time text
)
  RETURNS timestamp WITH time zone
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select (p_date::timestamp + p_slot_time::time) at time zone 'UTC';
$function$;

CREATE OR REPLACE FUNCTION public.booking_reference (
  p_booking_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  v_seed text := p_booking_id::text;
  v_hash integer := 0;
begin
  for i in 1..length(v_seed) loop
    v_hash := (v_hash * 31 + ascii(substr(v_seed, i, 1))) % 900000;
  end loop;

  return 'LP-' || (100000 + v_hash)::text;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_booking_reminders()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_booking record;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'booking_reminder_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'booking_reminder_webhook_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  -- Ventana de 30 minutos centrada en "ahora + 24h", igual de ancha que la
  -- cadencia del cron (cada 30 min) para no dejar huecos ni solapar dos
  -- corridas sobre la misma reserva. `reminder_sent_at` es la guarda contra
  -- reenvíos si el cron corre dos veces dentro de esa ventana.
  for v_booking in
    select b.*
    from public.bookings b
    where b.status = 'confirmed'
      and b.reminder_sent_at is null
      and public.booking_arrival_at(b.date, b.slot_time)
        between now() + interval '23 hours 45 minutes' and now() + interval '24 hours 15 minutes'
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('record', to_jsonb(v_booking)),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );

    update public.bookings set reminder_sent_at = now() where id = v_booking.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reception_checkin_booking (
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
    set checked_in_at = now(), status = 'in_progress', updated_at = now()
    where b.lounge_id = p_lounge_id
      and b.date = p_date
      and b.confirmation_code = upper(trim(p_confirmation_code))
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'No confirmed booking for % at % on %, or it is already checked in', p_confirmation_code, p_lounge_id, p_date;
  end if;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reception_lookup_booking (
  p_lounge_id         text,
  p_date              date,
  p_confirmation_code text
)
  RETURNS TABLE (
    id                         uuid,
    confirmation_code          text,
    member_name                text,
    member_email               text,
    slot_time                  text,
    special_requests           text,
    status                     text,
    checked_in_at              timestamp with time zone,
    no_show                    boolean,
    emergency_contact_name     text,
    emergency_contact_relation text,
    emergency_contact_phone    text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
begin
  select b.* into v_booking
  from public.bookings b
  where b.lounge_id = p_lounge_id
    and b.date = p_date
    and b.confirmation_code = upper(trim(p_confirmation_code))
    and b.status <> 'cancelled';

  if v_booking.id is null then
    return;
  end if;

  return query
    select
      v_booking.id,
      v_booking.confirmation_code,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      v_booking.slot_time,
      v_booking.special_requests,
      v_booking.status,
      v_booking.checked_in_at,
      v_booking.no_show,
      p.emergency_contact_name,
      p.emergency_contact_relation,
      p.emergency_contact_phone
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = v_booking.member_id;
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
    set no_show = true, status = 'completed', updated_at = now()
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

CREATE OR REPLACE FUNCTION public.reception_today_summary (
  p_lounge_id text,
  p_date      date
)
  RETURNS TABLE (
    expected   integer,
    checked_in integer
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    count(*) filter (where status <> 'cancelled')::int,
    count(*) filter (where checked_in_at is not null)::int
  from public.bookings
  where lounge_id = p_lounge_id and date = p_date;
$function$;

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';

GRANT EXECUTE ON FUNCTION "public"."booking_arrival_at"(date, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."booking_reference"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."dispatch_booking_reminders"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."dispatch_booking_reminders"() TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reception_checkin_booking"(text, date, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reception_lookup_booking"(text, date, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reception_report_no_show"(text, date, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reception_today_summary"(text, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

SELECT cron.schedule_in_database('send-booking-reminders', '*/30 * * * *', 'select public.dispatch_booking_reminders();', 'postgres', NULL, true);

ALTER TABLE "public"."bookings"
  ADD COLUMN "confirmation_code" text GENERATED ALWAYS AS (public.booking_reference(id)) STORED;

CREATE INDEX bookings_confirmation_code_idx ON public.bookings USING btree (confirmation_code);
