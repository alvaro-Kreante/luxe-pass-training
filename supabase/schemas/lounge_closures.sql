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
  created_at    timestamptz not null default now(),
  -- Story 10.9 — el admin los escribe desde el formulario del lounge.
  constraint lounge_closures_dates check (ends_on >= starts_on),
  constraint lounge_closures_reason check (trim(reason) <> '')
);

alter table public.lounge_closures enable row level security;

create policy "select lounge closures"
on public.lounge_closures for select
to authenticated
using ( true );

-- Story 10.9 — solo el admin escribe cierres (desde el formulario del lounge).
create policy "admins insert lounge closures"
on public.lounge_closures for insert
to authenticated
with check ( public.has_role('admin') );

create policy "admins update lounge closures"
on public.lounge_closures for update
to authenticated
using ( public.has_role('admin') )
with check ( public.has_role('admin') );

create policy "admins delete lounge closures"
on public.lounge_closures for delete
to authenticated
using ( public.has_role('admin') );

-- Story 10.9 — reservas confirmadas que caerían en un cierre, para avisar
-- al admin antes de guardarlo. Solo el conteo, nunca las filas.
create or replace function public.admin_closure_booking_count(p_lounge_id text, p_from date, p_to date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  return (
    select count(*)::integer from public.bookings b
    where b.lounge_id = p_lounge_id
      and b.date between p_from and p_to
      and b.status = 'confirmed'
  );
end;
$$;

revoke execute on function public.admin_closure_booking_count(text, date, date) from public, anon;
grant execute on function public.admin_closure_booking_count(text, date, date) to authenticated;
