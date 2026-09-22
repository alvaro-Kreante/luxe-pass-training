-- Story 6.3 — "Favorite lounges list" (`Preferences.dc.html`). Nace aquí,
-- dueña Epic 6 (ver docs/DATA-MODEL-MAP.md): tabla puente entre `profiles`
-- (Epic 1) y `lounges` (Epic 2) — un miembro puede favoritear varias lounges
-- y una lounge puede ser favorita de varios miembros, sin columnas propias
-- más allá de cuándo se guardó.
create table if not exists public.member_favorite_lounges (
  member_id  uuid not null references auth.users (id) on delete cascade,
  lounge_id  text not null references public.lounges (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, lounge_id)
);

alter table public.member_favorite_lounges enable row level security;

create policy "select own favorite lounges"
on public.member_favorite_lounges for select
to authenticated
using ( (select auth.uid()) = member_id );

create policy "insert own favorite lounges"
on public.member_favorite_lounges for insert
to authenticated
with check ( (select auth.uid()) = member_id );

create policy "delete own favorite lounges"
on public.member_favorite_lounges for delete
to authenticated
using ( (select auth.uid()) = member_id );
