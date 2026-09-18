SET local check_function_bodies = off;

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
