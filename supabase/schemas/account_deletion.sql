-- Story 6.3 — "Account deletion option with confirmation" (`DeleteAccount.dc.html`).
-- El artboard promete un borrado REVERSIBLE con gracia de 30 días ("Your data
-- is erased after 30 days. Sign in before then and everything comes back"),
-- así que confirmar no borra nada todavía: marca `profiles.deleted_at` (ver
-- `profiles.sql`) y cancela las reservas futuras, tal como el propio modal
-- ya declara ("upcoming bookings are cancelled... charged the fee").
-- Reactivar es tan simple como `deleted_at = null` — el cliente lo hace en
-- el siguiente login (`src/app/login/page.tsx`), sin RPC propia: RLS
-- "update own profile" ya lo permite sobre la fila propia.
--
-- El borrado FÍSICO real de `auth.users` (los 30 días cumplidos) es un
-- evento de tiempo, no de escritura — mismo patrón que
-- `booking_reminders.sql` (Story 5.3): un pg_cron que despacha, vía pg_net +
-- Supabase Vault, a una Edge Function con service role
-- (`supabase/functions/delete-account`). Igual gap conocido que esa
-- función: no se puede ejercitar de punta a punta en 30 días reales dentro
-- de este entorno de desarrollo, pero el mecanismo es el mismo ya probado.
create or replace function public.request_account_deletion()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.request_account_deletion() to authenticated;

-- La URL de la function y el secreto compartido viven en Supabase Vault (una
-- vez por proyecto), nunca aquí — mismo motivo y mismo alta que
-- `booking_receipt_webhook_url`/`_secret` (ver CLAUDE.md):
--   select vault.create_secret('http://host.docker.internal:54331/functions/v1/delete-account', 'account_deletion_webhook_url', '...');
--   select vault.create_secret('<= ACCOUNT_DELETION_WEBHOOK_SECRET>', 'account_deletion_webhook_secret', '...');
-- Sin esos dos secretos, el cron no hace nada (mismo guard que el resto de
-- este patrón).
create or replace function public.dispatch_account_deletions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.dispatch_account_deletions() from public, anon, authenticated;

select cron.schedule(
  'dispatch-account-deletions',
  '0 7 * * *',
  $$select public.dispatch_account_deletions();$$
);
