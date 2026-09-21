-- Story 4.2/5.1 — "Payment confirmation email receipt" / "Email with
-- booking info" (`Receipt.dc.html`). Igual que Epic 1 usa el Auth Hook
-- `send_email` para el email real de confirmación/recovery, este es el
-- mecanismo equivalente para un evento de negocio (Auth Hooks solo cubren
-- signup/recovery, no "se confirmó una reserva"): un Database Webhook —
-- trigger AFTER INSERT en `bookings` que, solo cuando `status = 'confirmed'`,
-- llama de forma asíncrona (pg_net) a la Edge Function
-- `send-booking-receipt`, la cual despacha el correo real vía Brevo.
--
-- La URL de la function y el secreto compartido que la autentica NO viven
-- aquí — serían distintos por ambiente (local/dev/prod) y el secreto no debe
-- comitearse. Se guardan en Supabase Vault, una vez por proyecto, igual que
-- el resto de secretos de este epic (ver CLAUDE.md §Email de recibo de
-- reserva). Sin esos dos secretos dados de alta, el trigger no hace nada —
-- nunca falla el insert de la reserva por esto.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_booking_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- SECURITY DEFINER hace falta de verdad (lee vault.decrypted_secrets, fuera
-- del alcance de anon/authenticated) — pero como función de trigger, nadie
-- puede invocarla directamente vía RPC (Postgres exige contexto real de
-- trigger para TG_OP/NEW), así que revocar el EXECUTE de PUBLIC es solo
-- defensa en profundidad, no la protección real.
revoke execute on function public.notify_booking_confirmed() from public;

drop trigger if exists booking_confirmed_send_receipt on public.bookings;

create trigger booking_confirmed_send_receipt
  after insert on public.bookings
  for each row
  execute function public.notify_booking_confirmed();
