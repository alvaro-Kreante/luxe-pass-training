-- Story 3.2 / 4.1 — disponibilidad en vivo (sustituye a la tabla
-- `lounge_availability`, que era una foto fija sembrada por migración con
-- 18 semanas desde TODAY — ver docs/PENDIENTES.md). Plazas libres de una
-- franja = `lounges.capacity` (aforo POR FRANJA) − reservas que ocupan
-- plaza en ella. Una franja solo "existe" (devuelve fila) cuando el lounge
-- la abre: banda en `lounges.bands` ('late' cuelga de 'evening', igual que
-- `SUPPORTING_BAND` en src/lib/lounge-profile.ts), día fuera de
-- `closed_weekdays` (o los de su temporada, `lounge_seasons`, Story 10.9) y
-- sin un `lounge_closures` que lo cubra. El cliente
-- sigue derivando "closed" de la ausencia de fila, como antes.
--
-- SECURITY DEFINER porque un miembro no puede leer (RLS) las reservas de
-- otros; solo devuelve conteos agregados, nunca filas de `bookings`. Sin
-- EXECUTE para `anon` (el catálogo de lounges ya exige sesión).

-- Estados que ocupan plaza: la reserva sigue viva o ya se consumió.
-- 'waitlisted' y 'cancelled' no.
create or replace function public.booking_occupies_seat(p_status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('confirmed', 'in_progress', 'completed');
$$;

create or replace function public.lounge_band_is_open(p_lounge_id text, p_date date, p_band text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.lounges l
    where l.id = p_lounge_id
      and (case when p_band = 'late' then 'evening' else p_band end) = any (l.bands)
      and not (extract(dow from p_date)::smallint = any (public.lounge_closed_weekdays_on(p_lounge_id, p_date)))
  )
  and not exists (
    select 1
    from public.lounge_closures c
    where c.lounge_id = p_lounge_id and p_date between c.starts_on and c.ends_on
  );
end;
$$;

create or replace function public.lounge_seats_left(p_lounge_id text, p_date date, p_band text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_taken integer;
begin
  select l.capacity into v_capacity from public.lounges l where l.id = p_lounge_id;

  select count(*) into v_taken
  from public.bookings b
  where b.lounge_id = p_lounge_id
    and b.date = p_date
    and b.band = p_band
    and public.booking_occupies_seat(b.status);

  return greatest(coalesce(v_capacity, 0) - v_taken, 0);
end;
$$;

create or replace function public.lounge_availability_range(p_lounge_id text, p_from date, p_to date)
returns table (date date, band text, seats_left integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_to - p_from > 92 then
    raise exception 'Range too long';
  end if;

  return query
    with cells as (
      select d::date as day, bnd.band
      from generate_series(p_from, p_to, interval '1 day') d
      cross join unnest(array['morning', 'afternoon', 'evening', 'late']) as bnd(band)
    ),
    taken as (
      select b.date as day, b.band, count(*)::integer as n
      from public.bookings b
      where b.lounge_id = p_lounge_id
        and b.date between p_from and p_to
        and public.booking_occupies_seat(b.status)
      group by b.date, b.band
    )
    select
      c.day,
      c.band,
      greatest(l.capacity - coalesce(t.n, 0), 0)
    from cells c
    join public.lounges l on l.id = p_lounge_id
    left join taken t on t.day = c.day and t.band = c.band
    where (case when c.band = 'late' then 'evening' else c.band end) = any (l.bands)
      and not (extract(dow from c.day)::smallint = any (public.lounge_closed_weekdays_on(p_lounge_id, c.day)))
      and not exists (
        select 1 from public.lounge_closures lc
        where lc.lounge_id = p_lounge_id and c.day between lc.starts_on and lc.ends_on
      )
    order by c.day, c.band;
end;
$$;

-- Story 2.1 — plazas libres de un día en todo el catálogo publicado, para
-- el chip "N slots today" / "Full" de /explore (sustituye a la instantánea
-- `lounges.slots_today`). Suma las franjas abiertas de
-- `lounge_availability_range`, así que respeta temporadas, cierres y
-- reservas. Solo lounges `live` (lo que el catálogo ya muestra) y solo
-- conteos agregados. `p_date` lo pasa el cliente (TODAY de la app).
create or replace function public.lounge_seats_on(p_date date)
returns table (lounge_id text, seats_left integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select l.id, coalesce(sum(r.seats_left), 0)::integer
    from public.lounges l
    left join lateral public.lounge_availability_range(l.id, p_date, p_date) r on true
    where l.content_status = 'live'
    group by l.id;
end;
$$;

revoke execute on function public.lounge_band_is_open(text, date, text) from public, anon, authenticated;
revoke execute on function public.lounge_seats_left(text, date, text) from public, anon, authenticated;
revoke execute on function public.lounge_availability_range(text, date, date) from public, anon;
grant execute on function public.lounge_availability_range(text, date, date) to authenticated;
revoke execute on function public.lounge_seats_on(date) from public, anon;
grant execute on function public.lounge_seats_on(date) to authenticated;
