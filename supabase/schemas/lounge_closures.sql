-- Story 3.2 — nace aquí (ver docs/DATA-MODEL-MAP.md). Cierres por festivo o
-- evento especial, separado de `lounge_availability` porque es un evento
-- por rango de fechas con sus propios metadatos (`reopens_label`,
-- `posted_on`), no una propiedad por celda de día/franja. Sustituye el
-- `Record<string, Closure[]>` hardcodeado de src/lib/lounge-profile.ts.
create table if not exists public.lounge_closures (
  id            uuid primary key default gen_random_uuid(),
  lounge_id     text not null references public.lounges (id) on delete cascade,
  starts_on     date not null,
  ends_on       date not null,
  reason        text not null,
  reopens_label text not null,
  posted_on     date not null,
  created_at    timestamptz not null default now()
);

alter table public.lounge_closures enable row level security;

create policy "select lounge closures"
on public.lounge_closures for select
to authenticated
using ( true );
