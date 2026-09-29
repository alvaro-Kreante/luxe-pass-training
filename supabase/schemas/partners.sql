-- Epic 7 — Partner Dashboard. `partners` nace aquí (dueño, ver
-- docs/DATA-MODEL-MAP.md). Decidido con el usuario (22 sept 2026): un
-- partner puede gestionar varios lounges, así que `partner_lounges` es una
-- tabla puente many-to-many, no una FK directa `lounges.partner_id`.
create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  -- Epic 7 · SetPassword.dc.html — la persona detrás de la cuenta. El admin
  -- los escribe al dar de alta el lounge; el partner los corrige al aceptar
  -- la invitación. `photo_path` es la ruta en el bucket `profile-photos`.
  first_name    text not null default '',
  last_name     text not null default '',
  photo_path    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.partners enable row level security;

create policy "select own partner account"
on public.partners for select
to authenticated
using ( (select auth.uid()) = user_id );

-- El partner corrige su nombre, móvil y foto (/partner/welcome). El email,
-- el negocio y el usuario no: los fija el trigger de abajo.
create policy "update own partner details"
on public.partners for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

create or replace function public.partners_guard_issued_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Sin `auth.uid()` es la service role (alta desde `admin-publish-lounge`).
  if (select auth.uid()) is not null
     and (new.contact_email is distinct from old.contact_email
          or new.business_name is distinct from old.business_name
          or new.user_id is distinct from old.user_id) then
    raise exception 'The work email is issued by En Soleil and cannot be changed';
  end if;
  return new;
end;
$$;

create or replace trigger partners_guard_issued_fields
before update on public.partners
for each row execute function public.partners_guard_issued_fields();

-- Sin policies de insert/delete: el alta la hace la Edge Function
-- `admin-publish-lounge` (service role) al publicar el lounge.

create table if not exists public.partner_lounges (
  partner_id uuid not null references public.partners (id) on delete cascade,
  lounge_id  text not null references public.lounges (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (partner_id, lounge_id)
);

alter table public.partner_lounges enable row level security;

create policy "select own partner lounges"
on public.partner_lounges for select
to authenticated
using (
  exists (
    select 1 from public.partners p
    where p.id = partner_lounges.partner_id and p.user_id = (select auth.uid())
  )
);

-- Helper reutilizado por las policies de `bookings` (Story 7.1 realtime) y
-- por las RPC de analítica de partner (Story 7.3) — los ids de lounge que
-- gestiona el partner autenticado. SECURITY INVOKER: las dos policies de
-- arriba ya dejan a un partner leer sus propias filas de `partners`/
-- `partner_lounges`.
create or replace function public.partner_lounge_ids()
returns setof text
language sql
stable
security invoker
set search_path = ''
as $$
  select pl.lounge_id
  from public.partner_lounges pl
  join public.partners p on p.id = pl.partner_id
  where p.user_id = auth.uid();
$$;

grant execute on function public.partner_lounge_ids() to authenticated;

-- Alta de un partner (proceso operativo, no self-service — no hay historia
-- de "partner signup" en Epic 7, solo `Login.dc.html`): crear el usuario de
-- Auth con la API de administración (`auth.admin.createUser`, service role,
-- igual que `signUpConfirmedAndSignIn` en `src/lib/testing/confirmed-user.ts`
-- para tests) y luego, con ese `user_id`:
--   insert into public.user_roles (user_id, role) values ('<user_id>', 'partner');
--   insert into public.partners (user_id, business_name, contact_email) values ('<user_id>', 'The Ainsworth', 'dana.okafor@theainsworth.com') returning id;
--   insert into public.partner_lounges (partner_id, lounge_id) values ('<partner_id>', 'the-ainsworth');
-- En local, `scripts/seed-partner-account.ts` automatiza justo esto para la
-- cuenta de muestra de `PARTNER_ACCOUNT` (`src/lib/partner.ts`).

-- Epic 8 · LoungeNewPartner.dc.html — el partner que el admin escribe en el
-- formulario del lounge. Mientras el lounge es borrador solo se recuerda;
-- al publicar, `admin-publish-lounge` crea la cuenta y rellena
-- `partner_id`. `admin_publish_lounge` exige ese `partner_id`, así que no
-- hay forma de publicar sin haber invitado a nadie.
create table if not exists public.lounge_partner_invites (
  lounge_id  text primary key references public.lounges (id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  email      text not null,
  mobile     text not null default '',
  partner_id uuid references public.partners (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lounge_partner_invites enable row level security;

-- Solo lectura para admin; se escribe con las RPC de admin_content.sql
-- (security definer) y con la Edge Function (service role).
create policy "admins read partner invites"
on public.lounge_partner_invites for select
to authenticated
using ( public.has_role('admin') );
