-- Story 7.2 — Booking Notifications for Partners. Igual mecanismo que
-- `booking_receipts.sql`/`booking_reminders.sql` (Database Webhook / pg_cron
-- vía pg_net a una Edge Function, secretos compartidos en Supabase Vault) —
-- aquí el destinatario es el partner, no el miembro. Las tres pantallas de
-- `/partner/emails/*` (`EmailNewBooking.dc.html`, `EmailCancellation.dc.html`,
-- `EmailDigest.dc.html`) siguen siendo la vista previa fija del artboard
-- (mismo criterio que "Settings → Notifications", sin historia que las pida
-- con datos reales) — el AC lo cubre el envío real, no esas pantallas.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

/* -------------------------------------------------------------------- */
/* "Email notification for each new booking"                            */
/* -------------------------------------------------------------------- */

-- Sin partner dado de alta para el lounge (la mayoría hoy, salvo
-- The Ainsworth), el loop de abajo no itera nada — no falla el insert de la
-- reserva por esto, igual que sin los dos secretos de Vault.
create or replace function public.notify_partner_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.notify_partner_new_booking() from public;

drop trigger if exists booking_confirmed_notify_partner on public.bookings;

create trigger booking_confirmed_notify_partner
  after insert on public.bookings
  for each row
  execute function public.notify_partner_new_booking();

/* -------------------------------------------------------------------- */
/* "Cancellation notifications with updated guest count"                */
/* -------------------------------------------------------------------- */

create or replace function public.notify_partner_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.notify_partner_cancellation() from public;

drop trigger if exists booking_cancelled_notify_partner on public.bookings;

create trigger booking_cancelled_notify_partner
  after update of status on public.bookings
  for each row
  execute function public.notify_partner_cancellation();

/* -------------------------------------------------------------------- */
/* "Morning digest email with day's guest list" — pg_cron, evento real   */
/* -------------------------------------------------------------------- */

-- `now()`/`current_date` reales a propósito, no el "hoy" de mockup
-- (`TODAY` en `src/lib/availability.ts`) — mismo criterio que
-- `dispatch_booking_reminders`/`dispatch_morning_notifications`: "la mañana
-- de hoy" es un instante de verdad. Mismo gap conocido que esas dos
-- funciones: el calendario de reserva parte del `TODAY` fijo de la app
-- (2025-09-09), así que el `current_date` real de este entorno no tiene
-- reservas hechas desde la UI — el mecanismo es correcto pero no se puede
-- ejercitar de punta a punta desde la app (ver docs/PENDIENTES.md).
create or replace function public.dispatch_partner_morning_digest()
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.dispatch_partner_morning_digest() from public, anon, authenticated;

select cron.schedule(
  'send-partner-morning-digest',
  '30 6 * * *',
  $$select public.dispatch_partner_morning_digest();$$
);

-- Alta de los cuatro secretos de Vault, una vez por proyecto (local/dev/prod)
-- — mismo patrón que `booking_receipt_webhook_*`/`booking_reminder_webhook_*`:
--   select vault.create_secret('http://host.docker.internal:54331/functions/v1/send-partner-booking-event', 'partner_notification_webhook_url', '...');
--   select vault.create_secret('<= PARTNER_NOTIFICATION_WEBHOOK_SECRET>', 'partner_notification_webhook_secret', '...');
--   select vault.create_secret('http://host.docker.internal:54331/functions/v1/send-partner-digest', 'partner_digest_webhook_url', '...');
--   select vault.create_secret('<= PARTNER_DIGEST_WEBHOOK_SECRET>', 'partner_digest_webhook_secret', '...');
-- Sin ellos, ninguna de las tres funciones de arriba hace nada (mismo guard
-- que el resto de este patrón).
