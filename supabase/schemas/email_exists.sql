-- Story 1.1 — "Duplicate email addresses are prevented with clear error
-- messaging". Supabase Auth deliberadamente no revela si un email ya existe
-- cuando la confirmación por email está activa (anti-enumeración). Este RPC
-- es la excepción consciente para poder cumplir el AC al pie de la letra:
-- solo expone un booleano, nada más de auth.users.
create or replace function public.email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(p_email)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;
