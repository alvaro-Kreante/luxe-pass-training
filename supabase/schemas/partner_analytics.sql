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
-- Los ingresos son lo cobrado de verdad: pagos `succeeded` de las visitas
-- y la tarifa de no-show registrada en la reserva.
create or replace function public.partner_analytics_summary(p_from date, p_to date, p_lounge_id text default null)
returns table (
  bookings int,
  day_pass_visits int,
  membership_visits int,
  no_shows int,
  cancellations int,
  day_pass_revenue_cents int,
  no_show_fee_cents int
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
      count(*) filter (where b.status = 'cancelled')::int,
      coalesce(sum(
        (select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      ) filter (where b.status <> 'cancelled' and b.no_show = false), 0)::int,
      coalesce(sum(b.cancellation_fee_cents) filter (where b.no_show = true), 0)::int
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
-- no-shows. `attributed` es lo que el miembro pagó de verdad: la suma de
-- sus pagos `succeeded` de esas reservas (una visita de membresía sin
-- cobro suma 0; un pago `pending` o `refunded` no cuenta).
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
      -- PRIV-01: sin "Share your details with the lounge", ni nombre ni email.
      case when coalesce(p.privacy_share_with_lounge, true) then coalesce(p.full_name, split_part(u.email::text, '@', 1)) else 'Private guest' end,
      case when coalesce(p.privacy_share_with_lounge, true) then u.email::text end,
      count(*)::int,
      min(b.date),
      max(b.date),
      coalesce(sum(
        (select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded')
      ), 0)::numeric(10, 2) / 100
    from public.bookings b
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
      and b.status <> 'cancelled'
      and b.no_show = false
    group by b.member_id, p.full_name, u.email, p.privacy_share_with_lounge
    order by count(*) desc;
end;
$$;

grant execute on function public.partner_repeat_guests(text) to authenticated;

-- Ficha del invitado en "Guests" (GuestDetail.dc.html reutilizado): cada
-- reserva del miembro en los lounges del partner, con lo cobrado de verdad
-- (pagos `succeeded`) y el estado en el lounge. Nunca reservas de lounges
-- ajenos. `p_lounge_id` null = "All lounges".
create or replace function public.partner_guest_history(p_member_id uuid, p_lounge_id text default null)
returns table (
  booking_id uuid,
  lounge_name text,
  date date,
  slot_time text,
  status text,
  checked_in boolean,
  no_show boolean,
  paid_cents int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      b.id,
      l.name,
      b.date,
      b.slot_time,
      b.status,
      b.checked_in_at is not null,
      b.no_show,
      coalesce((select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded'), 0)::int
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    where b.member_id = p_member_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
    order by b.date desc, b.slot_time;
end;
$$;

grant execute on function public.partner_guest_history(uuid, text) to authenticated;
