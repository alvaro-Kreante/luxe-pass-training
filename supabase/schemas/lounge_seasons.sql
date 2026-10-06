-- Story 10.9 — temporadas del lounge: un periodo con su propio horario
-- semanal que, esos días, reemplaza al habitual (`lounges.weekly_hours` /
-- `closed_weekdays`). Dueño Epic 10 (ver docs/DATA-MODEL-MAP.md). Las bandas
-- (`lounges.bands`) siguen siendo del lounge. Solo el admin escribe; el
-- miembro y el partner la leen, como `lounge_closures`.
create table if not exists public.lounge_seasons (
  id              uuid primary key default gen_random_uuid(),
  lounge_id       text not null references public.lounges (id) on delete cascade,
  name            text not null default '',
  starts_on       date not null,
  ends_on         date not null,
  -- Domingo primero, como `lounges.weekly_hours`; "Closed" = cerrado.
  weekly_hours    jsonb not null,
  -- Derivado de `weekly_hours` por el trigger de abajo, para la disponibilidad.
  closed_weekdays smallint[] not null default '{}',
  created_at      timestamptz not null default now(),
  constraint lounge_seasons_dates check (ends_on >= starts_on),
  constraint lounge_seasons_week check (jsonb_typeof(weekly_hours) = 'array' and jsonb_array_length(weekly_hours) = 7)
);

create index if not exists lounge_seasons_lounge_idx on public.lounge_seasons (lounge_id, starts_on);

alter table public.lounge_seasons enable row level security;

create policy "select lounge seasons"
on public.lounge_seasons for select
to authenticated
using ( true );

create policy "admins insert lounge seasons"
on public.lounge_seasons for insert
to authenticated
with check ( public.has_role('admin') );

create policy "admins update lounge seasons"
on public.lounge_seasons for update
to authenticated
using ( public.has_role('admin') )
with check ( public.has_role('admin') );

create policy "admins delete lounge seasons"
on public.lounge_seasons for delete
to authenticated
using ( public.has_role('admin') );

-- Deriva los días cerrados y rechaza solapes con otra temporada del mismo lounge.
create or replace function public.lounge_seasons_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ends_on < new.starts_on then
    raise exception 'The end date can''t be before the start date' using errcode = '23514';
  end if;
  new.closed_weekdays := (
    select coalesce(array_agg((d.ord - 1)::smallint order by d.ord), '{}')
    from jsonb_array_elements_text(new.weekly_hours) with ordinality as d(hours, ord)
    where lower(trim(d.hours)) in ('', 'closed')
  );
  if exists (
    select 1 from public.lounge_seasons s
    where s.lounge_id = new.lounge_id
      and s.id <> new.id
      and daterange(s.starts_on, s.ends_on, '[]') && daterange(new.starts_on, new.ends_on, '[]')
  ) then
    raise exception 'This season overlaps another season of the lounge';
  end if;
  return new;
end;
$$;

create or replace trigger lounge_seasons_validate
before insert or update on public.lounge_seasons
for each row execute function public.lounge_seasons_validate();

-- Los días cerrados que rigen una fecha: los de su temporada, si la hay.
create or replace function public.lounge_closed_weekdays_on(p_lounge_id text, p_date date)
returns smallint[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.closed_weekdays from public.lounge_seasons s
     where s.lounge_id = p_lounge_id and p_date between s.starts_on and s.ends_on
     limit 1),
    (select l.closed_weekdays from public.lounges l where l.id = p_lounge_id)
  );
$$;

revoke execute on function public.lounge_closed_weekdays_on(text, date) from public, anon, authenticated;
