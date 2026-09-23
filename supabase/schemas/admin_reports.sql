-- Epic 8 — Admin & Support. Story 8.2 (Data Export & Analytics). Todas las
-- RPC agregan sobre TODA la red (nunca un lounge elegido, a diferencia de
-- `partner_analytics.sql`) — solo `has_role('admin')` puede llamarlas.
--
-- Rango de fechas: se recibe siempre como parámetro explícito (`p_from`,
-- `p_to`), nunca `current_date` — mismo criterio que `confirm_booking`/las
-- RPC de recepción: el dominio de reservas del proyecto vive sobre el "hoy"
-- de mockup fijo (`TODAY` en `src/lib/availability.ts`, 2025-09-09), no el
-- reloj real. El cliente manda siempre un rango relativo a `TODAY`.
--
-- Ingresos: solo cargos reales de Stripe (`payments.status = 'succeeded'`)
-- — la facturación de membresía (Epic 9, sin conectar) no es un dato real
-- todavía, así que "revenue by partner" no la incluye, a diferencia de la
-- narrativa del mock (`lib/admin-analytics.ts`, ya retirada). Desviación
-- anotada en docs/design/COMPONENT-MAP.md.

/* -------------------------------------------------------------------- */
/* "No-show rate tracking" + resumen del período                        */
/* -------------------------------------------------------------------- */

create or replace function public.admin_network_summary(p_from date, p_to date)
returns table (
  bookings int,
  attended int,
  no_shows int,
  cancelled int,
  joined int,
  left_count int,
  active_members int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      (select count(*)::int from public.bookings b where b.date between p_from and p_to),
      (select count(*)::int from public.bookings b where b.date between p_from and p_to and b.status <> 'cancelled' and b.no_show = false),
      (select count(*)::int from public.bookings b where b.date between p_from and p_to and b.no_show = true),
      (select count(*)::int from public.bookings b where b.date between p_from and p_to and b.status = 'cancelled'),
      (select count(*)::int from public.profiles p where p.created_at::date between p_from and p_to),
      (select count(*)::int from public.profiles p where p.deleted_at is not null and p.deleted_at::date between p_from and p_to),
      -- Total en vivo, no acotado al período — "active members" es un
      -- estado actual, no algo que un rango de fechas recorte.
      (select count(*)::int from public.profiles p where p.deleted_at is null);
end;
$$;

grant execute on function public.admin_network_summary(date, date) to authenticated;

create or replace function public.admin_bookings_by_day(p_from date, p_to date)
returns table (day date, bookings int)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select d.day::date, count(b.id)::int
    from generate_series(p_from, p_to, interval '1 day') as d(day)
    left join public.bookings b on b.date = d.day::date
    group by d.day
    order by d.day;
end;
$$;

grant execute on function public.admin_bookings_by_day(date, date) to authenticated;

/* -------------------------------------------------------------------- */
/* "Revenue reporting by partner and time period"                       */
/* -------------------------------------------------------------------- */

create or replace function public.admin_revenue_by_partner(p_from date, p_to date)
returns table (
  lounge_id text,
  lounge_name text,
  bookings int,
  gross_revenue_cents int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `auth.uid() is null` cubre la llamada interna desde
  -- `admin_generate_report_csv`/`dispatch_scheduled_reports` (sin sesión,
  -- SECURITY DEFINER encadenado) — un llamador autenticado que no sea admin
  -- se sigue rechazando igual.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      l.id,
      l.name,
      count(b.id)::int,
      coalesce(sum(pm.amount_cents) filter (where pm.status = 'succeeded'), 0)::int
    from public.lounges l
    left join public.bookings b on b.lounge_id = l.id and b.date between p_from and p_to
    left join public.payments pm on pm.booking_id = b.id
    group by l.id, l.name
    having count(b.id) > 0
    order by count(b.id) desc;
end;
$$;

grant execute on function public.admin_revenue_by_partner(date, date) to authenticated;

/* -------------------------------------------------------------------- */
/* "Most popular lounges and amenities report" + "Geographic usage"     */
/* -------------------------------------------------------------------- */

create or replace function public.admin_lounge_popularity(p_from date, p_to date)
returns table (
  lounge_id text,
  lounge_name text,
  area text,
  bookings int,
  no_shows int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      l.id, l.name, l.neighborhood || ', ' || l.city,
      count(b.id)::int,
      count(*) filter (where b.no_show = true)::int
    from public.lounges l
    left join public.bookings b on b.lounge_id = l.id and b.date between p_from and p_to
    group by l.id, l.name, l.neighborhood, l.city
    having count(b.id) > 0
    order by count(b.id) desc;
end;
$$;

grant execute on function public.admin_lounge_popularity(date, date) to authenticated;

create or replace function public.admin_amenity_demand(p_from date, p_to date)
returns table (amenity text, bookings int)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select a.amenity, count(*)::int
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    cross join lateral unnest(l.amenities) as a(amenity)
    where b.date between p_from and p_to
    group by a.amenity
    order by count(*) desc;
end;
$$;

grant execute on function public.admin_amenity_demand(date, date) to authenticated;

create or replace function public.admin_city_demand(p_from date, p_to date)
returns table (city text, lounges int, bookings int)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      l.city,
      count(distinct l.id)::int,
      count(b.id)::int
    from public.lounges l
    left join public.bookings b on b.lounge_id = l.id and b.date between p_from and p_to
    group by l.city
    having count(b.id) > 0
    order by count(b.id) desc;
end;
$$;

grant execute on function public.admin_city_demand(date, date) to authenticated;

/* -------------------------------------------------------------------- */
/* "Data export in CSV format" — filas crudas por dataset                */
/* -------------------------------------------------------------------- */

create or replace function public.admin_export_bookings(p_from date, p_to date)
returns table (
  confirmation_code text,
  member_id uuid,
  member_name text,
  member_email text,
  member_phone text,
  lounge_name text,
  city text,
  date date,
  slot_time text,
  status text,
  amount_charged_cents int,
  payment_method text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null`.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.confirmation_code,
      b.member_id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      p.phone,
      l.name,
      l.city,
      b.date,
      b.slot_time,
      b.status,
      coalesce(pm.amount_cents, b.cancellation_fee_cents, 0),
      case when pm.id is not null then 'Stripe' when b.cancellation_fee_cents is not null then 'Fee recorded' else 'Membership' end
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    left join public.payments pm on pm.booking_id = b.id and pm.status = 'succeeded'
    where b.date between p_from and p_to
    order by b.date, b.slot_time;
end;
$$;

grant execute on function public.admin_export_bookings(date, date) to authenticated;

create or replace function public.admin_export_members()
returns table (
  member_id uuid,
  full_name text,
  email text,
  phone text,
  membership_status text,
  member_since timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null`.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select u.id, coalesce(p.full_name, split_part(u.email::text, '@', 1)), u.email::text, p.phone,
           coalesce(p.membership_status, 'active'), p.created_at, p.deleted_at
    from auth.users u
    join public.profiles p on p.id = u.id
    order by p.created_at desc;
end;
$$;

grant execute on function public.admin_export_members() to authenticated;

create or replace function public.admin_export_no_shows_cancellations(p_from date, p_to date)
returns table (
  confirmation_code text,
  member_name text,
  lounge_name text,
  date date,
  status text,
  no_show boolean,
  fee_cents int
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null`.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.confirmation_code,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      l.name,
      b.date,
      b.status,
      b.no_show,
      coalesce(b.cancellation_fee_cents, 0)
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.date between p_from and p_to and (b.no_show = true or b.status = 'cancelled')
    order by b.date desc;
end;
$$;

grant execute on function public.admin_export_no_shows_cancellations(date, date) to authenticated;

/* -------------------------------------------------------------------- */
/* "Automated daily/weekly report generation" + "Scheduled email        */
/* delivery of reports" — pg_cron real, tercer uso de este mecanismo    */
/* después de Story 5.3/6.2 y de Story 7.2                              */
/* -------------------------------------------------------------------- */

create table if not exists public.scheduled_reports (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  dataset       text not null check (dataset in ('bookings', 'members', 'revenue-by-partner', 'no-shows-cancellations')),
  recipients    text[] not null,
  cadence       text not null check (cadence in ('daily', 'weekly', 'monthly')),
  enabled       boolean not null default true,
  created_by    uuid references auth.users (id),
  last_run_at   timestamptz,
  next_run_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.scheduled_reports enable row level security;

create policy "admin manages scheduled reports"
on public.scheduled_reports for all
to authenticated
using ( public.has_role('admin') )
with check ( public.has_role('admin') );

-- Construye el CSV de un dataset para la ventana [p_from, p_to] — reutilizado
-- tanto por el cron (`dispatch_scheduled_reports`) como, opcionalmente, por
-- el propio `/admin/reports` si algún día pidiera generarlo en SQL en vez de
-- en el cliente (hoy no: el cliente arma el CSV de descarga inmediata a
-- partir de las mismas RPC `admin_export_*` de arriba, columna a columna,
-- según lo que el formulario dejó marcado).
create or replace function public.admin_generate_report_csv(p_dataset text, p_from date, p_to date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_csv text;
begin
  -- Ver nota de `admin_revenue_by_partner` sobre `auth.uid() is null` — el
  -- cron llama a esta función sin sesión.
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  if p_dataset = 'bookings' then
    select 'Reference,Member,Email,Lounge,City,Date,Time,Status,Amount' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[confirmation_code, member_name, member_email, lounge_name, city, date::text, slot_time, status, round(amount_charged_cents / 100.0, 2)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_bookings(p_from, p_to);
  elsif p_dataset = 'members' then
    select 'Name,Email,Phone,Status,Member since' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[full_name, email, coalesce(phone, ''), membership_status, member_since::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_members();
  elsif p_dataset = 'revenue-by-partner' then
    select 'Lounge,Bookings,Gross revenue' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[lounge_name, bookings::text, round(gross_revenue_cents / 100.0, 2)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_revenue_by_partner(p_from, p_to);
  elsif p_dataset = 'no-shows-cancellations' then
    select 'Reference,Member,Lounge,Date,Status,Fee' || chr(10) || coalesce(string_agg(
      public.admin_csv_row(array[confirmation_code, member_name, lounge_name, date::text, status, round(fee_cents / 100.0, 2)::text]),
      chr(10)
    ), '') into v_csv
    from public.admin_export_no_shows_cancellations(p_from, p_to);
  else
    raise exception 'Unknown dataset %', p_dataset;
  end if;

  return v_csv;
end;
$$;

grant execute on function public.admin_generate_report_csv(text, date, date) to authenticated;

-- Helper de cuoteo mínimo — cada celda entre comillas dobles, comillas
-- internas escapadas doblándolas (mismo criterio que `guestListToCsv`/
-- `revenueBreakdownToCsv` en TS).
create or replace function public.admin_csv_row(p_cells text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select string_agg('"' || replace(coalesce(c, ''), '"', '""') || '"', ',')
  from unnest(p_cells) as c;
$$;

-- `now()`/`current_date` reales a propósito (paso del tiempo, no el "hoy" de
-- mockup) — igual criterio que `dispatch_partner_morning_digest`. La
-- ventana de datos que reporta cada corrida sigue ancланda a `TODAY`
-- (2025-09-09 + el tamaño de la cadencia), mismo gap conocido que Story 5.3:
-- no ejercitable de punta a punta en este entorno hasta que
-- `lounge_availability` deje de estar anclada a esa fecha fija.
create or replace function public.dispatch_scheduled_reports()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_report record;
  v_from date;
  v_to date := date '2025-09-09';
  v_csv text;
  v_next interval;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'admin_report_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'admin_report_webhook_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  for v_report in
    select * from public.scheduled_reports
    where enabled = true and next_run_at <= now()
  loop
    v_next := case v_report.cadence
      when 'daily' then interval '1 day'
      when 'weekly' then interval '7 days'
      else interval '30 days'
    end;
    v_from := v_to - (extract(day from v_next)::int - 1);

    v_csv := public.admin_generate_report_csv(v_report.dataset, v_from, v_to);

    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'report_name', v_report.name,
        'recipients', to_jsonb(v_report.recipients),
        'csv', v_csv
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );

    update public.scheduled_reports
      set last_run_at = now(), next_run_at = now() + v_next, updated_at = now()
      where id = v_report.id;
  end loop;
end;
$$;

revoke execute on function public.dispatch_scheduled_reports() from public, anon, authenticated;

select cron.schedule(
  'dispatch-scheduled-reports',
  '*/15 * * * *',
  $$select public.dispatch_scheduled_reports();$$
);

-- Alta de los dos secretos de Vault, una vez por proyecto (local/dev/prod)
-- — mismo patrón que el resto de este mecanismo:
--   select vault.create_secret('http://host.docker.internal:54331/functions/v1/send-admin-report', 'admin_report_webhook_url', '...');
--   select vault.create_secret('<= ADMIN_REPORT_WEBHOOK_SECRET>', 'admin_report_webhook_secret', '...');
-- Sin ellos, `dispatch_scheduled_reports()` no hace nada (mismo guard que
-- el resto de este patrón).
