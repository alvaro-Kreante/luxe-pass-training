-- Epic 7 — Partner Dashboard. Decisión de arquitectura pospuesta a propósito
-- hasta este momento (ver docs/DATA-MODEL-MAP.md: "cómo se distingue el rol
-- member/partner/admin sobre auth.users... conviene decidirla en cuanto se
-- empiece Epic 7, no antes"). Decidido con el usuario (22 sept 2026): tabla
-- `user_roles`, no un custom claim en el JWT ni esquemas separados — no toca
-- `auth.users`, no exige registrar un segundo Custom Access Token Hook por
-- proyecto remoto, y el rol se puede cambiar sin esperar a que el JWT del
-- miembro se refresque.
--
-- Sin fila = miembro corriente. Solo se registran los roles elevados
-- (partner aquí; admin cuando arranque Epic 8) — no hace falta sembrar
-- 'member' para cada perfil existente, porque ninguna policy de miembro
-- depende de esta tabla (siguen siendo `auth.uid() = user_id` sobre su
-- propia fila, como siempre).
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('partner', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "select own roles"
on public.user_roles for select
to authenticated
using ( (select auth.uid()) = user_id );

-- Sin policies de insert/update/delete: dar de alta un partner/admin es un
-- proceso operativo (ver "Alta de un partner" en partners.sql), nunca un
-- self-service desde el cliente.

-- Helper reutilizado por las policies/RPC de otras tablas (bookings,
-- analítica de partner). SECURITY INVOKER a propósito, no DEFINER: la policy
-- de arriba ya deja a cualquier usuario autenticado leer su propia fila, así
-- que no hace falta bypassear RLS para esto — evita el "SECURITY DEFINER de
-- más" que advierte el checklist de seguridad de Supabase.
create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = p_role
  );
$$;

grant execute on function public.has_role(text) to authenticated;
