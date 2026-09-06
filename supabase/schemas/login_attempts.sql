-- Story 1.2 — "Account lockout after 5 failed attempts (15min timeout)".
-- Supabase Auth no tiene lockout por cuenta (solo rate-limit por IP, ya
-- subido en 1.1), así que se resuelve con esta tabla + 3 RPC de apoyo.
--
-- Trade-off consciente: el lockout es por email, no por cuenta autenticada
-- — cualquiera que conozca el email de otra persona puede bloquearle el
-- acceso 15 min fallando adrede. Es inherente a "lockout tras N intentos"
-- tal como lo pide el AC; no se resuelve con más infraestructura (IP+email,
-- captcha) porque el AC no lo pide.
create table if not exists public.login_attempts (
  email text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_attempts enable row level security;
-- Sin policies: la tabla solo se toca vía las funciones de abajo, igual que
-- `email_exists` en la Story 1.1.

-- Deben coincidir con MAX_FAILED_ATTEMPTS/LOCKOUT_MINUTES de
-- src/lib/authentication.ts — SQL no puede leer esas constantes de TS.
create or replace function public.check_login_lock(p_email text)
returns table (locked boolean, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locked_until timestamptz;
begin
  select la.locked_until into v_locked_until
  from public.login_attempts la
  where la.email = lower(trim(p_email));

  return query select (v_locked_until is not null and v_locked_until > now()), v_locked_until;
end;
$$;

create or replace function public.record_failed_login(p_email text)
returns table (failed_count int, locked boolean, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_failed_count int;
  v_locked_until timestamptz;
begin
  insert into public.login_attempts as la (email, failed_count, updated_at)
  values (v_email, 1, now())
  on conflict (email) do update
    set failed_count = case
          when la.locked_until is not null and la.locked_until > now()
            then la.failed_count
          else la.failed_count + 1
        end,
        updated_at = now()
  returning la.failed_count into v_failed_count;

  if v_failed_count >= 5 then
    update public.login_attempts la
      set locked_until = coalesce(la.locked_until, now() + interval '15 minutes')
      where la.email = v_email
      returning la.locked_until into v_locked_until;
  end if;

  return query select v_failed_count, (v_locked_until is not null and v_locked_until > now()), v_locked_until;
end;
$$;

create or replace function public.reset_login_attempts(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts where email = lower(trim(p_email));
$$;

grant execute on function public.check_login_lock(text) to anon, authenticated;
grant execute on function public.record_failed_login(text) to anon, authenticated;
grant execute on function public.reset_login_attempts(text) to anon, authenticated;
