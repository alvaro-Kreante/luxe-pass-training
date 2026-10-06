-- Story 7.3 — Partner Analytics. Las tres RPC agregan sobre los lounges
-- que gestiona el partner autenticado (`partner_lounge_ids()`,
-- `partners.sql`): todos con `p_lounge_id` null ("All lounges") o solo el
-- elegido en el selector de la cabecera (Story 10.6). SECURITY DEFINER hace
-- falta de verdad (lee `profiles`/`auth.users` de otros miembros para
-- `partner_repeat_guests`), pero cada función autoriza explícitamente contra
-- `partner_lounge_ids()` en vez de delegarlo solo a RLS.
--
-- "day pass" vs "visita de membresía": no hay un campo de tipo de visita en
-- `profiles`/`bookings` (Epic 9, planes de membresía, sigue sin conectar) —
-- se deriva de si la reserva tiene un pago real cobrado de verdad (Epic 4),
-- igual que `partner_guest_list.is_day_pass` en `bookings.sql`. Documentado
-- como decisión consciente en docs/design/COMPONENT-MAP.md "Backend real —
-- Epic 7".

/* -------------------------------------------------------------------- */
/* "Weekly/monthly booking volume reports" + resumen del periodo         */
/* -------------------------------------------------------------------- */

-- `bookings` cuenta TODAS las reservas del rango (cualquier estado): igual
-- que `ANALYTICS_SUMMARY` en `src/lib/partner.ts`, day_pass_visits +
-- membership_visits + no_shows + cancellations debe sumar `bookings`.
create or replace function public.partner_analytics_summary(p_from date, p_to date, p_lounge_id text default null)
returns table (
  bookings int,
  day_pass_visits int,
  membership_visits int,
  no_shows int,
  cancellations int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      count(*)::int,
      count(*) filter (
        where b.status <> 'cancelled' and b.no_show = false
          and exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      )::int,
      count(*) filter (
        where b.status <> 'cancelled' and b.no_show = false
          and not exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      )::int,
      count(*) filter (where b.no_show = true)::int,
      count(*) filter (where b.status = 'cancelled')::int
    from public.bookings b
    where b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
      and b.date between p_from and p_to;
end;
$$;

grant execute on function public.partner_analytics_summary(date, date, text) to authenticated;

-- "Bookings a day" — una fila por fecha del rango, incluidas las fechas sin
-- ninguna reserva (0), para que el gráfico de barras no salte huecos.
create or replace function public.partner_bookings_by_day(p_from date, p_to date, p_lounge_id text default null)
returns table (day date, bookings int)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select d.day::date, count(b.id)::int
    from generate_series(p_from, p_to, interval '1 day') as d(day)
    left join public.bookings b
      on b.date = d.day::date and b.lounge_id in (select public.partner_lounge_ids())
        and (p_lounge_id is null or b.lounge_id = p_lounge_id)
    group by d.day
    order by d.day;
end;
$$;

grant execute on function public.partner_bookings_by_day(date, date, text) to authenticated;

/* -------------------------------------------------------------------- */
/* "Repeat guest identification"                                        */
/* -------------------------------------------------------------------- */

-- Toda la historia del member en los lounges del partner (no acotado a un
-- rango de fechas: "repeat guest" es un hecho acumulado, no del periodo
-- elegido en Analytics). Solo cuentan visitas reales: ni canceladas ni
-- no-shows. `attributed` reutiliza las mismas tarifas que
-- `DAY_PASS_PARTNER_RATE`/`MEMBERSHIP_VISIT_PARTNER_RATE` de
-- `src/lib/partner.ts` — **deben coincidir** (mismo criterio que
-- `booking_reference`, duplicado a propósito entre SQL/TS).
create or replace function public.partner_repeat_guests(p_lounge_id text default null)
returns table (
  member_id uuid,
  member_name text,
  member_email text,
  visits int,
  first_visit date,
  last_visit date,
  attributed numeric(10, 2)
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      b.member_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      count(*)::int,
      min(b.date),
      max(b.date),
      sum(
        case
          when exists (select 1 from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
            then 75.00
          else 38.00
        end
      )::numeric(10, 2)
    from public.bookings b
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
      and b.status <> 'cancelled'
      and b.no_show = false
    group by b.member_id, p.full_name, u.email
    order by count(*) desc;
end;
$$;

grant execute on function public.partner_repeat_guests(text) to authenticated;
