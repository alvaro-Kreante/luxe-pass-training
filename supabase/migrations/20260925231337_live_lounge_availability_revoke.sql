SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."lounge_availability_range"(text, date, date) FROM "anon";

REVOKE ALL ON FUNCTION "public"."lounge_band_is_open"(text, date, text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."lounge_band_is_open"(text, date, text) FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."lounge_seats_left"(text, date, text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."lounge_seats_left"(text, date, text) FROM "authenticated";

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
