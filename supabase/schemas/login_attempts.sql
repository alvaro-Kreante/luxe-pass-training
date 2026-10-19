-- Story 1.2 — "Account lockout after 5 failed attempts (15min timeout)".
-- Supabase Auth no tiene lockout por cuenta (solo rate-limit por IP, ya
-- subido en 1.1), así que se resuelve con esta tabla + 3 RPC de apoyo.
--
-- Trade-off consciente: el lockout es por email, no por cuenta autenticada
-- — cualquiera que conozca el email de otra persona puede bloquearle el
-- acceso 15 min fallando adrede. Es inherente a "lockout tras N intentos"
-- tal como lo pide el AC; no se resuelve con más infraestructura (IP+email,
-- captcha) porque el AC no lo pide.
--
-- SEC-03 (docs/audit/seguridad-y-datos.md): el bloqueo lo aplica Supabase
-- Auth con el hook "Password Verification Attempt"
-- (`hook_password_verification_attempt`, al final), así que una llamada
-- directa a `/auth/v1/token` también lo sufre. Ese hook es del plan Team: en
-- un proyecto remoto sin él, el bloqueo solo lo aplica `/login` vía
-- `record_failed_login` (ver docs/PENDIENTES.md §2.7b).
create table if not exists public.login_attempts (
  email text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  -- Último fallo que contó el hook: `record_failed_login` no vuelve a
  -- contar el mismo fallo cuando `/login` lo registra justo después.
  hook_counted_at timestamptz
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
          when la.hook_counted_at > now() - interval '5 seconds'
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

-- Solo quien acaba de iniciar sesión con ese email limpia su contador: sin
-- esta comprobación, cualquiera podía desbloquear otra cuenta (SEC-03).
create or replace function public.reset_login_attempts(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.login_attempts
  where email = lower(trim(p_email))
    and email = lower((select auth.jwt() ->> 'email'));
$$;

grant execute on function public.check_login_lock(text) to anon, authenticated;
grant execute on function public.record_failed_login(text) to anon, authenticated;
revoke execute on function public.reset_login_attempts(text) from public, anon;
grant execute on function public.reset_login_attempts(text) to authenticated;

-- SEC-03 — hook "Password Verification Attempt" de Supabase Auth (plan
-- Team; activo en local vía `[auth.hook.password_verification_attempt]` de
-- config.toml). Auth lo llama en cada intento con contraseña, venga de
-- `/login` o de una llamada directa:
--   - cuenta bloqueada → `reject`, aunque la contraseña sea correcta;
--   - contraseña correcta → limpia el contador;
--   - contraseña incorrecta → suma un fallo y bloquea al quinto.
-- Mismas cifras que `record_failed_login` (5 fallos, 15 minutos).
create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_email text;
  v_locked_until timestamptz;
  v_failed_count int;
begin
  select lower(u.email) into v_email
  from auth.users u
  where u.id = (event ->> 'user_id')::uuid;

  if v_email is null then
    return jsonb_build_object('decision', 'continue');
  end if;

  select la.locked_until into v_locked_until
  from public.login_attempts la
  where la.email = v_email;

  if v_locked_until is not null and v_locked_until > now() then
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'Account temporarily locked. Try again later or reset your password.',
      'should_logout_user', false
    );
  end if;

  if (event ->> 'valid')::boolean then
    delete from public.login_attempts la where la.email = v_email;
    return jsonb_build_object('decision', 'continue');
  end if;

  insert into public.login_attempts as la (email, failed_count, updated_at, hook_counted_at)
  values (v_email, 1, now(), now())
  on conflict (email) do update
    set failed_count = case
          when la.locked_until is not null then 1
          else la.failed_count + 1
        end,
        locked_until = null,
        updated_at = now(),
        hook_counted_at = now()
  returning la.failed_count into v_failed_count;

  if v_failed_count >= 5 then
    update public.login_attempts la
      set locked_until = now() + interval '15 minutes'
      where la.email = v_email;
  end if;

  return jsonb_build_object('decision', 'continue');
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant select, insert, update, delete on table public.login_attempts to supabase_auth_admin;
create policy "auth hook manages login attempts" on public.login_attempts
  for all to supabase_auth_admin
  using (true)
  with check (true);

revoke execute on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;
grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
