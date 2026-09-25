-- Story 5.3 — Booking Reminder Notification, "24 hrs before the booking
-- time". A diferencia de `booking_receipts.sql` (Database Webhook, evento
-- `AFTER INSERT`), aquí no hay ninguna escritura que dispare el email — el
-- disparador es el propio paso del tiempo. Primer job programado del
-- proyecto: `pg_cron` corre `dispatch_booking_reminders()` cada 30 minutos,
-- que a su vez llama (`pg_net`, igual que el trigger de recibo) a la Edge
-- Function `send-booking-reminder`. Ver CLAUDE.md §Email de recibo de
-- reserva para el mecanismo gemelo por evento, y
-- docs/design/COMPONENT-MAP.md "Backend real — Epic 5" para el detalle de
-- este.
-- A diferencia de las funciones de recepción (bookings.sql), aquí `now()`
-- SÍ es el reloj real de Postgres a propósito: "24 horas antes de la
-- reserva" es un intervalo de verdad, no el "hoy" de mockup de la app. Gap
-- conocido en este entorno: la disponibilidad ya se calcula en vivo para
-- cualquier fecha, pero el calendario de reserva parte del `TODAY` fijo de
-- la app (2025-09-09, `src/lib/availability.ts`), así que ninguna reserva
-- hecha desde la UI cae dentro de "ahora + 24h" del reloj real — el
-- mecanismo es correcto, pero no se puede ejercitar de punta a punta desde
-- la app (ver docs/PENDIENTES.md).
create extension if not exists pg_cron with schema extensions;

-- `slot_time` es texto tipo "3:30 PM" (ver bookings.sql) — Postgres acepta
-- ese formato como literal de `time`. Se interpreta como UTC, igual que el
-- resto del proyecto formatea `bookings.date`/`slot_time` (ver
-- `formatWeekdayDate` en `send-booking-receipt/index.ts`, `timeZone: "UTC"`).
create or replace function public.booking_arrival_at(p_date date, p_slot_time text)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (p_date::timestamp + p_slot_time::time) at time zone 'UTC';
$$;

-- La URL de la function y el secreto compartido viven en Supabase Vault
-- (una vez por proyecto), nunca en este archivo versionado — mismo motivo
-- que `booking_receipt_webhook_url`/`_secret` en `booking_receipts.sql`.
-- Sin esos dos secretos dados de alta, la función no hace nada (ningún
-- recordatorio se manda, pero tampoco falla el cron).
create or replace function public.dispatch_booking_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Igual que `notify_booking_confirmed` en `booking_receipts.sql`: este
-- proyecto auto-expone toda función de `public` a `anon`/`authenticated`
-- (ver `auto_expose_new_tables` en `config.toml`) incluso tras revocar solo
-- de PUBLIC, así que esto es defensa en profundidad, no la protección
-- real — la real es que no hace nada sin los dos secretos de Vault, y
-- reintentar no reenvía nada gracias a `reminder_sent_at`.
revoke execute on function public.dispatch_booking_reminders() from public, anon, authenticated;

select cron.schedule(
  'send-booking-reminders',
  '*/30 * * * *',
  $$select public.dispatch_booking_reminders();$$
);
