-- Story 3.2 — nace aquí (ver docs/DATA-MODEL-MAP.md). Calendario semanal de
-- plazas por lounge/día/franja, sustituye la fórmula hash determinista de
-- `weeklyAvailability` en src/lib/lounge-profile.ts. Solo existe una fila
-- cuando la franja/día está soportado por `lounges.bands`/`closed_weekdays`
-- — un día/franja no soportado sigue derivándose como "closed" en el
-- cliente, sin fila propia (ver docs/design/COMPONENT-MAP.md "Backend real
-- — Epic 3" para el horizonte de siembra).
create table if not exists public.lounge_availability (
  id         uuid primary key default gen_random_uuid(),
  lounge_id  text not null references public.lounges (id) on delete cascade,
  date       date not null,
  band       text not null check (band in ('morning', 'afternoon', 'evening', 'late')),
  seats_left smallint not null,
  updated_at timestamptz not null default now(),
  unique (lounge_id, date, band)
);

alter table public.lounge_availability enable row level security;

create policy "select lounge availability"
on public.lounge_availability for select
to authenticated
using ( true );
