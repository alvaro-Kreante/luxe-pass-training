-- Epic 10 · Story 10.1 — un partner es la organización (hotel, spa, club…)
-- detrás de uno o varios lounges, con uno o varios usuarios. Sustituye el
-- modelo del Epic 7/8, donde un partner era una persona con un lounge
-- (`partner_lounges`, `lounge_partner_invites`). Dueño: Epic 10, ver
-- docs/DATA-MODEL-MAP.md.
--
--   partners (1) ──< lounges.partner_id         un lounge, como mucho un partner
--   partners (1) ──< partner_members (N)        un usuario, un solo partner
--   partners.representative_id → partner_members, siempre del mismo partner
--
-- Sin policies de insert/delete en ninguna de las dos tablas: el alta y la
-- gestión las hacen las RPC de admin (security definer) y el service role.
create table if not exists public.partners (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (trim(name) <> ''),
  contact_email     text not null default '',
  -- PartnerNew.dc.html — el edificio central, solo informativo y en texto:
  -- sin Google Maps. `city` es la ciudad principal del listado (Partners.dc.html).
  address_line1     text not null default '',
  address_line2     text not null default '',
  city              text not null default '',
  region            text not null default '',
  postal_code       text not null default '',
  country           text not null default '',
  -- Nace en draft; al activarlo sus usuarios reciben el email de crear
  -- contraseña (Story 10.4). Suspendido, sus usuarios no entran y sus
  -- lounges salen del catálogo.
  status            text not null default 'draft' check (status in ('draft', 'active', 'suspended')),
  representative_id uuid,
  activated_at      timestamptz,
  suspended_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.partner_members (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners (id) on delete cascade,
  -- Null mientras el partner es draft: la cuenta de Auth nace al activarlo.
  user_id     uuid unique references auth.users (id) on delete cascade,
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  mobile      text not null default '',
  -- `profile-photos`, la sube el propio usuario en /partner/welcome.
  photo_path  text,
  suspended_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, partner_id)
);

create unique index if not exists partner_members_email_key on public.partner_members (lower(email));
create index if not exists partner_members_partner_id_idx on public.partner_members (partner_id);

-- El representante es siempre un usuario del mismo partner. Borrarlo solo
-- vacía `representative_id` (el trigger de abajo impide hacerlo mientras
-- queden otros usuarios).
alter table public.partners drop constraint if exists partners_representative_fkey;
alter table public.partners
  add constraint partners_representative_fkey
  foreign key (representative_id, id) references public.partner_members (id, partner_id)
  on delete set null (representative_id);

alter table public.partners enable row level security;
alter table public.partner_members enable row level security;

/* -------------------------------------------------------------------- */
/* Quién ve qué                                                          */
/* -------------------------------------------------------------------- */

-- Un usuario con sesión solo lee `id`, `name` y `status` de un partner: el
-- miembro ve el nombre del partner de un lounge publicado (Story 10.8), el
-- usuario partner el de su organización. El resto (contacto, dirección)
-- solo sale por las RPC de admin.
revoke all on public.partners from anon, authenticated;
grant select (id, name, status) on public.partners to authenticated;

create policy "admins read partners"
on public.partners for select
to authenticated
using ( public.has_role('admin') );

create policy "members read own partner"
on public.partners for select
to authenticated
using (
  exists (
    select 1 from public.partner_members m
    where m.partner_id = partners.id and m.user_id = (select auth.uid())
  )
);

create policy "read partner of a live lounge"
on public.partners for select
to authenticated
using (
  exists (
    select 1 from public.lounges l
    where l.partner_id = partners.id and l.content_status = 'live'
  )
);

create policy "read own partner membership"
on public.partner_members for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "admins read partner members"
on public.partner_members for select
to authenticated
using ( public.has_role('admin') );

-- /partner/welcome — el usuario corrige su nombre, móvil y foto. El resto lo
-- fija el trigger de abajo.
create policy "update own partner details"
on public.partner_members for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

/* -------------------------------------------------------------------- */
/* Reglas de los usuarios partner                                        */
/* -------------------------------------------------------------------- */

-- Story 10.3 — un usuario partner es siempre una cuenta nueva: una persona
-- con cuenta de miembro, partner o admin no puede añadirse. Solo al crear
-- la fila; después la cuenta que nace al activar tiene ese mismo email.
create or replace function public.partner_members_require_new_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users u where lower(u.email) = lower(trim(new.email))) then
    raise exception '% is already in use', lower(trim(new.email));
  end if;
  new.email := lower(trim(new.email));
  return new;
end;
$$;

revoke execute on function public.partner_members_require_new_email() from public, anon, authenticated;

create or replace trigger partner_members_require_new_email
before insert on public.partner_members
for each row execute function public.partner_members_require_new_email();

-- Con sesión (no service role) el usuario solo cambia nombre, móvil y foto.
create or replace function public.partner_members_guard_issued_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not public.has_role('admin')
     and (new.email is distinct from old.email
          or new.partner_id is distinct from old.partner_id
          or new.user_id is distinct from old.user_id
          or new.suspended_at is distinct from old.suspended_at) then
    raise exception 'The work email is issued by En Soleil and cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger partner_members_guard_issued_fields
before update on public.partner_members
for each row execute function public.partner_members_guard_issued_fields();

-- El primer usuario de un partner queda como representante.
create or replace function public.partner_members_default_representative()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.partners p set representative_id = new.id, updated_at = now()
  where p.id = new.partner_id and p.representative_id is null;
  return new;
end;
$$;

revoke execute on function public.partner_members_default_representative() from public, anon, authenticated;

create or replace trigger partner_members_default_representative
after insert on public.partner_members
for each row execute function public.partner_members_default_representative();

-- PartnerUserEdit.dc.html — mientras queden otros usuarios, primero se elige
-- un representante nuevo. Al borrar el partner entero (cascade) su fila ya
-- no existe y el borrado sigue.
create or replace function public.partner_members_keep_representative()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.partners p where p.id = old.partner_id and p.representative_id = old.id)
     and exists (select 1 from public.partner_members m where m.partner_id = old.partner_id and m.id <> old.id) then
    raise exception 'Choose a new representative before deleting this user';
  end if;
  return old;
end;
$$;

revoke execute on function public.partner_members_keep_representative() from public, anon, authenticated;

create or replace trigger partner_members_keep_representative
before delete on public.partner_members
for each row execute function public.partner_members_keep_representative();

/* -------------------------------------------------------------------- */
/* Helpers de autorización                                               */
/* -------------------------------------------------------------------- */

-- Los lounges que el usuario partner autenticado puede ver: todos los de su
-- partner, publicados o no, mientras partner y usuario estén activos. Lo usan
-- las policies de `lounges` y `bookings` y las RPC de partner
-- (`bookings.sql`, `partner_analytics.sql`). SECURITY DEFINER porque la
-- policy de `lounges` lo llama y a su vez lee `bookings`, cuya policy lo
-- vuelve a llamar: como invoker sería recursivo. Solo filtra por
-- `auth.uid()`, así que nunca devuelve lounges de otro.
create or replace function public.partner_lounge_ids()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select l.id
  from public.partner_members m
  join public.partners p on p.id = m.partner_id and p.status = 'active'
  join public.lounges l on l.partner_id = p.id
  where m.user_id = (select auth.uid()) and m.suspended_at is null
  order by l.id;
$$;

revoke execute on function public.partner_lounge_ids() from public, anon;
grant execute on function public.partner_lounge_ids() to authenticated;

-- Alta a mano para cuentas de muestra en local: `scripts/seed-partners.mjs`.
