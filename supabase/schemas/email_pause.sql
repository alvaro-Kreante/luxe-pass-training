-- Mientras corre la suite de Vitest en local, `vitest.global-setup.ts` deja
-- una fila con `until` en el futuro y la borra al terminar; `sendBrevoEmail`
-- (supabase/functions/_shared/brevo.ts) no envía nada en LOCAL si hay una
-- vigente. `until` acota la pausa si la suite se corta sin teardown.
-- Solo la usa service_role (que salta RLS): sin policies, nadie más la ve.
create table if not exists public.email_pause (
  id text primary key,
  until timestamptz not null
);

alter table public.email_pause enable row level security;

revoke all on public.email_pause from anon, authenticated;
