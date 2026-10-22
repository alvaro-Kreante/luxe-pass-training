-- Story 7.3 — "Downloadable reports: export to CSV" (Reports.dc.html). Los
-- informes que no salen de Analytics/Guests (volumen semanal/mensual,
-- revenue por mes, registro de no-shows), el envío al equipo y el registro
-- de "Downloaded recently". Mismo criterio que `partner_analytics.sql`:
-- cada función autoriza contra `partner_lounge_ids()`; `p_lounge_id` null es
-- "All lounges". Importes = pagos `succeeded` reales.

/* -------------------------------------------------------------------- */
/* Volumen semanal/mensual y revenue mes a mes                           */
/* -------------------------------------------------------------------- */

-- Una fila por semana (lunes) o mes del rango, también los periodos sin
-- reservas. Las mismas categorías que `partner_analytics_summary`.
create or replace function public.partner_booking_volume(
  p_from date,
  p_to date,
  p_grain text,
  p_lounge_id text default null
)
returns table (
  period_start date,
  bookings int,
  arrived int,
  no_shows int,
  cancellations int,
  day_pass_visits int,
  membership_visits int,
  day_pass_revenue_cents int,
  no_show_fee_cents int,
  complimentary_visits int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_grain not in ('week', 'month') then
    raise exception 'Unknown grain %', p_grain;
  end if;

  return query
    with scoped as (
      select
        b.*,
        date_trunc(p_grain, b.date)::date as period,
        coalesce((select sum(pm.amount_cents) from public.payments pm where pm.booking_id = b.id and pm.status = 'succeeded'), 0) as paid,
        exists (select 1 from public.day_pass_redemptions r where r.booking_id = b.id) as complimentary
      from public.bookings b
      where b.lounge_id in (select public.partner_lounge_ids())
        and (p_lounge_id is null or b.lounge_id = p_lounge_id)
        and b.date between p_from and p_to
    )
    select
      p.period::date,
      count(s.id)::int,
      count(s.id) filter (where s.checked_in_at is not null and s.no_show = false)::int,
      count(s.id) filter (where s.no_show = true)::int,
      count(s.id) filter (where s.status = 'cancelled')::int,
      count(s.id) filter (where s.status <> 'cancelled' and s.no_show = false and s.paid > 0)::int,
      count(s.id) filter (where s.status <> 'cancelled' and s.no_show = false and s.paid = 0 and not s.complimentary)::int,
      coalesce(sum(s.paid) filter (where s.status <> 'cancelled' and s.no_show = false), 0)::int,
      coalesce(sum(s.cancellation_fee_cents) filter (where s.no_show = true), 0)::int,
      count(s.id) filter (where s.status <> 'cancelled' and s.no_show = false and s.paid = 0 and s.complimentary)::int
    from generate_series(date_trunc(p_grain, p_from), date_trunc(p_grain, p_to), ('1 ' || p_grain)::interval) as p(period)
    left join scoped s on s.period = p.period::date
    group by p.period
    order by p.period;
end;
$$;

revoke execute on function public.partner_booking_volume(date, date, text, text) from public, anon;
grant execute on function public.partner_booking_volume(date, date, text, text) to authenticated;

/* -------------------------------------------------------------------- */
/* Registro de no-shows                                                  */
/* -------------------------------------------------------------------- */

-- PRIV-01: sin "Share your details with the lounge", "Private guest".
create or replace function public.partner_no_show_log(p_from date, p_to date, p_lounge_id text default null)
returns table (
  date date,
  slot_time text,
  lounge_name text,
  guest_name text,
  reason text,
  fee_cents int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      b.date,
      b.slot_time,
      l.name,
      case when coalesce(p.privacy_share_with_lounge, true) then coalesce(p.full_name, split_part(u.email::text, '@', 1)) else 'Private guest' end,
      b.no_show_reason,
      coalesce(b.cancellation_fee_cents, 0)
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.no_show = true
      and b.lounge_id in (select public.partner_lounge_ids())
      and (p_lounge_id is null or b.lounge_id = p_lounge_id)
      and b.date between p_from and p_to
    order by b.date desc, b.slot_time;
end;
$$;

revoke execute on function public.partner_no_show_log(date, date, text) from public, anon;
grant execute on function public.partner_no_show_log(date, date, text) to authenticated;

/* -------------------------------------------------------------------- */
/* "Email it to the team"                                                */
/* -------------------------------------------------------------------- */

-- El equipo del partner de quien llama: sus usuarios con cuenta, salvo los
-- suspendidos (mismo criterio que `partner_notification_recipients`). Lo usa
-- la Edge Function `send-partner-report` con el JWT del partner, así que
-- nadie puede elegir a quién se envía.
create or replace function public.partner_report_recipients()
returns table (email text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.email
  from public.partner_members me
  join public.partners p on p.id = me.partner_id and p.status = 'active'
  join public.partner_members m on m.partner_id = p.id
  where me.user_id = (select auth.uid()) and me.suspended_at is null
    and m.user_id is not null and m.suspended_at is null
  order by m.email;
$$;

revoke execute on function public.partner_report_recipients() from public, anon;
grant execute on function public.partner_report_recipients() to authenticated;

/* -------------------------------------------------------------------- */
/* "Downloaded recently"                                                 */
/* -------------------------------------------------------------------- */

-- Cada descarga o envío, con lo necesario para "Download again" (que
-- regenera el informe con los mismos ajustes y los datos de ahora). Sin
-- policies: solo se escribe y se lee por las dos funciones de abajo.
create table if not exists public.partner_report_exports (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partners (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  report_id    text not null,
  lounge_id    text references public.lounges (id) on delete set null,
  range_months int,
  columns      text[] not null default '{}',
  delivery     text not null check (delivery in ('download', 'email')),
  filename     text not null,
  row_count    int not null,
  created_at   timestamptz not null default now()
);

create index if not exists partner_report_exports_partner_created_idx
  on public.partner_report_exports (partner_id, created_at desc);
create index if not exists partner_report_exports_user_idx
  on public.partner_report_exports (user_id);
create index if not exists partner_report_exports_lounge_idx
  on public.partner_report_exports (lounge_id);

alter table public.partner_report_exports enable row level security;

create or replace function public.partner_log_report_export(
  p_report_id text,
  p_lounge_id text,
  p_range_months int,
  p_columns text[],
  p_delivery text,
  p_filename text,
  p_row_count int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
begin
  select m.partner_id into v_partner_id
  from public.partner_members m
  join public.partners p on p.id = m.partner_id and p.status = 'active'
  where m.user_id = (select auth.uid()) and m.suspended_at is null;

  if v_partner_id is null then
    raise exception 'Not authorized';
  end if;
  if p_lounge_id is not null and p_lounge_id not in (select public.partner_lounge_ids()) then
    raise exception 'Not authorized';
  end if;

  insert into public.partner_report_exports (partner_id, user_id, report_id, lounge_id, range_months, columns, delivery, filename, row_count)
  values (v_partner_id, (select auth.uid()), p_report_id, p_lounge_id, p_range_months, coalesce(p_columns, '{}'), p_delivery, p_filename, p_row_count);
end;
$$;

revoke execute on function public.partner_log_report_export(text, text, int, text[], text, text, int) from public, anon;
grant execute on function public.partner_log_report_export(text, text, int, text[], text, text, int) to authenticated;

create or replace function public.partner_recent_report_exports(p_limit int default 5)
returns table (
  id uuid,
  report_id text,
  lounge_id text,
  range_months int,
  columns text[],
  delivery text,
  filename text,
  row_count int,
  created_at timestamptz,
  by_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.report_id, e.lounge_id, e.range_months, e.columns, e.delivery, e.filename, e.row_count, e.created_at,
    coalesce(m.first_name || ' ' || left(m.last_name, 1) || '.', 'A teammate')
  from public.partner_report_exports e
  join public.partner_members me on me.partner_id = e.partner_id
    and me.user_id = (select auth.uid()) and me.suspended_at is null
  left join public.partner_members m on m.user_id = e.user_id
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 20);
$$;

revoke execute on function public.partner_recent_report_exports(int) from public, anon;
grant execute on function public.partner_recent_report_exports(int) to authenticated;
