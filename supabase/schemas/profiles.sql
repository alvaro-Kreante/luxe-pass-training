-- Story 1.1 — perfil de miembro creado en los 3 pasos de /onboarding.
-- Campos requeridos por el AC ("name*, phone*, ... location*, Industry*"):
-- full_name, phone, city, industry. El resto es opcional.
--
-- `stripe_customer_id` (Story 4.2, Epic 4) es la excepción: Epic 4 no es
-- dueño de `profiles`, pero un Customer de Stripe es 1:1 con el miembro, no
-- con una reserva — vive aquí en vez de en `payments` para no crear uno por
-- cada intento de pago. Se rellena de forma perezosa (la primera vez que el
-- miembro paga algo con Stripe), nunca en el alta de la Story 1.1.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  photo_url text,
  birth_day smallint check (birth_day between 1 and 31),
  birth_month smallint check (birth_month between 1 and 12),
  interests text[] not null default '{}',
  city text not null,
  travel_cities text[] not null default '{}',
  job_title text,
  industry text not null,
  company text,
  terms_accepted_at timestamptz not null,
  stripe_customer_id text unique,
  -- Story 5.2 (Epic 5) — "Emergency contact information accessible to
  -- staff". Gap anticipado en docs/DATA-MODEL-MAP.md: la Story 1.1 no lo
  -- pide en el alta, así que nace nullable aquí. La captura real (editar
  -- este dato desde `/profile/privacy`) sigue siendo Story 6.3, sin
  -- conectar — `reception_lookup_booking` (Epic 5) es quien primero lo lee
  -- de verdad.
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  -- Story 6.3 (Epic 6) — "Membership status Active/Inactive". El resto de
  -- `MEMBERSHIP_SUMMARY` (plan, renovación, visitas) sigue sin conectar:
  -- dueño real es `memberships` (Epic 9, todavía mockup) — ver
  -- docs/DATA-MODEL-MAP.md. Esta columna es un stub mínimo consciente para
  -- no bloquear Epic 6 en Epic 9; a reconciliar cuando Epic 9 se conecte.
  membership_status text not null default 'active' check (membership_status in ('active', 'inactive')),
  -- Story 6.3 — "Preferred amenities selection" (`Preferences.dc.html`).
  -- Reutiliza los ids de `lib/amenities.ts` (Story 2.2), sin CHECK contra esa
  -- lista porque vive en TS, no en SQL — igual criterio que `interests`, ya
  -- libre de CHECK desde la Story 1.1.
  preferred_amenities text[] not null default '{}',
  -- Story 6.3 — "Privacy settings for data usage" (`Privacy.dc.html`).
  privacy_personalized_recommendations boolean not null default true,
  privacy_share_with_lounge boolean not null default true,
  privacy_product_research boolean not null default false,
  privacy_marketing_analytics boolean not null default false,
  -- Story 6.3 — "Account deletion option with confirmation". Soft-delete con
  -- gracia de 30 días (`DeleteAccount.dc.html`: "erased after 30 days...
  -- sign in before then and everything comes back") — el borrado físico real
  -- de `auth.users` es un cron aparte, ver `supabase/schemas/account_deletion.sql`.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile"
on public.profiles for select
to authenticated
using ( (select auth.uid()) = id );

create policy "insert own profile"
on public.profiles for insert
to authenticated
with check ( (select auth.uid()) = id );

create policy "update own profile"
on public.profiles for update
to authenticated
using ( (select auth.uid()) = id )
with check ( (select auth.uid()) = id );
