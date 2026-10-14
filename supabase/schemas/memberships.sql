-- Story 9.1 — Membership. Nace aquí, dueña Epic 9 (ver docs/DATA-MODEL-MAP.md).
-- Decisiones de producto (23 sept 2026, confirmadas con el usuario antes de
-- implementar — ver docs/design/COMPONENT-MAP.md "Backend real — Epic 9"):
--
--   - Un miembro nace SIN fila aquí (membresía inactiva) hasta elegir plan.
--   - Elegir plan o subir de mensual a anual es un cobro PUNTUAL real de
--     Stripe (modo test) por el importe que calcula `membership_change_quote`
--     — la fila solo cambia cuando `payments.status` pasa a 'succeeded'
--     (trigger `apply_membership_payment` de más abajo), nunca desde el
--     cliente. Mismo principio que Story 4.2: el webhook de Stripe decide.
--   - La renovación automática SÍ cobra (decisión del usuario, 23 sept
--     2026, revierte la de "sin cobro recurrente"): al vencer un término con
--     `auto_renew = true`, el cron diario llama a la Edge Function
--     `membership-renewal` (`type: "charge"`), que cobra off-session la
--     tarjeta guardada del miembro — sin Stripe Billing, mismo PaymentIntent
--     que el resto del proyecto. Si no hay tarjeta o el cobro falla, la
--     membresía vence y se avisa al miembro.
--   - Pasar de anual a mensual "espera al final del término"
--     (`Plans.dc.html`): `pending_plan` guarda el cambio y la renovación
--     cobra ya el plan nuevo.
--
-- `profiles.membership_status` (stub de Story 6.3) pasa a ser un espejo de
-- esta tabla (trigger `sync_profile_membership_status`), para no romper a
-- Epic 6/8, que ya lo leen.
--
-- Precios en centavos, duplicados de `MONTHLY_PRICE`/`ANNUAL_PRICE` de
-- `src/lib/membership.ts` — SQL no puede leer constantes de TS, mismo
-- criterio que `DAY_PASS_PRICE` en `_shared/stripe-context.ts`.
create table if not exists public.memberships (
  member_id              uuid primary key references public.profiles (id) on delete cascade,
  plan                   text not null check (plan in ('monthly', 'annual')),
  status                 text not null default 'active' check (status in ('active', 'expired')),
  -- "Member since" — se conserva al subir de plan o al volver a contratar.
  started_at             timestamptz not null default now(),
  current_period_start   timestamptz not null default now(),
  -- Fecha de renovación (anual) / próximo cargo (mensual).
  current_period_end     timestamptz not null,
  auto_renew             boolean not null default true,
  -- Guarda contra reenvíos del aviso de un mes antes (cron de más abajo).
  renewal_notice_sent_at timestamptz,
  -- Plan con el que se renovará el término siguiente (solo anual → mensual:
  -- la subida mensual → anual es inmediata, con prorrateo).
  pending_plan           text check (pending_plan in ('monthly', 'annual')),
  -- Guarda contra un segundo cobro de la misma renovación si el cron vuelve
  -- a correr antes de que la Edge Function termine.
  renewal_attempted_at   timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.memberships enable row level security;

create policy "select own membership"
on public.memberships for select
to authenticated
using ( (select auth.uid()) = member_id );

-- Sin policies de insert/update/delete: la fila la escriben el trigger de
-- `payments` y las RPC de abajo (SECURITY DEFINER), nunca el cliente.

/* -------------------------------------------------------------------- */
/* Espejo en profiles.membership_status (Epic 6/8 ya lo leen)            */
/* -------------------------------------------------------------------- */

create or replace function public.sync_profile_membership_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set membership_status = 'inactive' where id = old.member_id;
    return old;
  end if;

  update public.profiles
  set membership_status = case when new.status = 'active' then 'active' else 'inactive' end
  where id = new.member_id;
  return new;
end;
$$;

revoke execute on function public.sync_profile_membership_status() from public, anon, authenticated;

drop trigger if exists membership_changed_sync_profile on public.memberships;

create trigger membership_changed_sync_profile
  after insert or update of status or delete on public.memberships
  for each row
  execute function public.sync_profile_membership_status();

/* -------------------------------------------------------------------- */
/* AC "Upgrade options to monthly subscribers and pricing"              */
/* -------------------------------------------------------------------- */

-- Cuánto cuesta pasar al plan `p_plan` HOY para el miembro con sesión.
-- La usa el cliente para pintar el modal y la Edge Function
-- `stripe-membership-checkout` (con el JWT del propio miembro) para decidir
-- el importe real del cobro — nunca lo decide el navegador.
--   - Sin membresía activa: alta, precio completo.
--   - Mensual → anual: precio anual menos los días no usados del mes
--     (`Upgrade.dc.html`: "Credit for 22 unused days on monthly").
--   - Mismo plan o anual → mensual: error. La bajada no se cobra hoy:
--     "espera al final del término" y se programa con
--     `schedule_membership_plan_change` (más abajo).
create or replace function public.membership_change_quote(p_plan text)
returns table (
  kind         text,
  plan         text,
  term_start   timestamptz,
  term_end     timestamptz,
  charge_cents integer,
  credit_cents integer,
  credit_days  integer,
  due_cents    integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_current public.memberships;
  v_charge integer;
  v_total_days integer;
  v_credit_days integer;
  v_credit integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_plan not in ('monthly', 'annual') then
    raise exception 'Unknown plan %', p_plan;
  end if;

  v_charge := case p_plan when 'annual' then 240000 else 24900 end;

  select * into v_current
  from public.memberships m
  where m.member_id = v_uid and m.status = 'active';

  if not found then
    return query select
      'join'::text, p_plan, now(),
      now() + case p_plan when 'annual' then interval '1 year' else interval '1 month' end,
      v_charge, 0, 0, v_charge;
    return;
  end if;

  if v_current.plan = p_plan then
    raise exception 'Already on the % plan', p_plan;
  end if;
  if v_current.plan = 'annual' then
    raise exception 'Switching to monthly takes effect at the end of the current term';
  end if;

  v_total_days := greatest(1, round(extract(epoch from (v_current.current_period_end - v_current.current_period_start)) / 86400)::integer);
  v_credit_days := least(v_total_days, greatest(0, ceil(extract(epoch from (v_current.current_period_end - now())) / 86400)::integer));
  v_credit := round(24900::numeric * v_credit_days / v_total_days)::integer;

  return query select
    'upgrade'::text, p_plan, now(), now() + interval '1 year',
    v_charge, v_credit, v_credit_days, v_charge - v_credit;
end;
$$;

revoke execute on function public.membership_change_quote(text) from public, anon;
grant execute on function public.membership_change_quote(text) to authenticated;

/* -------------------------------------------------------------------- */
/* El pago liquidado es quien activa o cambia el plan                   */
/* -------------------------------------------------------------------- */

-- `payments.membership_plan` (ver payments.sql) marca un pago como compra de
-- membresía. Cubre las dos rutas de cobro sin tocar el webhook: tarjeta
-- guardada (la Edge Function inserta el pago ya 'succeeded') y tarjeta nueva
-- (el webhook de Stripe pasa el pago de 'pending' a 'succeeded').
-- Renovación (término activo ya vencido): el término nuevo empieza donde
-- acabó el anterior, no "ahora" — el cron corre una vez al día y no debe
-- regalar ni comerse horas del término.
create or replace function public.apply_membership_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.memberships;
  v_start timestamptz;
  v_interval interval;
begin
  if new.membership_plan is null or new.status <> 'succeeded' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'succeeded' then
    return new;
  end if;

  select * into v_current from public.memberships where member_id = new.member_id;
  v_start := case
    when v_current.status = 'active' and v_current.current_period_end <= now() then v_current.current_period_end
    else now()
  end;
  v_interval := case new.membership_plan when 'annual' then interval '1 year' else interval '1 month' end;

  insert into public.memberships as m (
    member_id, plan, status, started_at, current_period_start, current_period_end, auto_renew
  )
  values (new.member_id, new.membership_plan, 'active', now(), v_start, v_start + v_interval, true)
  on conflict (member_id) do update set
    plan = excluded.plan,
    status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    auto_renew = true,
    pending_plan = null,
    renewal_notice_sent_at = null,
    renewal_attempted_at = null,
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.apply_membership_payment() from public, anon, authenticated;

drop trigger if exists payment_settled_apply_membership on public.payments;

create trigger payment_settled_apply_membership
  after insert or update of status on public.payments
  for each row
  execute function public.apply_membership_payment();

/* -------------------------------------------------------------------- */
/* AC "Renewal date and auto-renewal settings"                          */
/* -------------------------------------------------------------------- */

-- `AutoRenew.dc.html`: "Nothing changes today. Your membership stays active
-- until <fecha> — and then it ends... Any booking dated after <fecha> is
-- cancelled at no charge". Apagarla cancela esas reservas sin tarifa;
-- volver a encenderla no las recupera (ya se avisó en el modal).
create or replace function public.set_membership_auto_renew(p_auto_renew boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_end timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Sin auto-renovación no habrá término siguiente: un cambio de plan
  -- programado deja de tener sentido.
  update public.memberships
  set auto_renew = p_auto_renew,
      pending_plan = case when p_auto_renew then pending_plan else null end,
      updated_at = now()
  where member_id = v_uid and status = 'active'
  returning current_period_end into v_end;

  if not found then
    raise exception 'No active membership';
  end if;

  if not p_auto_renew then
    update public.bookings
    set status = 'cancelled', cancelled_at = now(), cancellation_fee_cents = 0, updated_at = now()
    where member_id = v_uid
      and status in ('confirmed', 'waitlisted')
      and date > (v_end at time zone 'UTC')::date;
  end if;
end;
$$;

revoke execute on function public.set_membership_auto_renew(boolean) from public, anon;
grant execute on function public.set_membership_auto_renew(boolean) to authenticated;

-- Anual → mensual (`Plans.dc.html`: "Moving to monthly waits until your
-- current term ends"). No cobra nada hoy: la renovación del término cobra
-- ya el mensual. Programarlo reactiva la auto-renovación — es la forma de
-- decir "sigo, pero en mensual".
create or replace function public.schedule_membership_plan_change(p_plan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_plan <> 'monthly' then
    raise exception 'Only the switch to monthly is scheduled — annual takes effect straight away';
  end if;

  update public.memberships
  set pending_plan = 'monthly', auto_renew = true, updated_at = now()
  where member_id = v_uid and status = 'active' and plan = 'annual';

  if not found then
    raise exception 'No active annual membership';
  end if;
end;
$$;

revoke execute on function public.schedule_membership_plan_change(text) from public, anon;
grant execute on function public.schedule_membership_plan_change(text) to authenticated;

create or replace function public.cancel_membership_plan_change()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.memberships
  set pending_plan = null, updated_at = now()
  where member_id = v_uid and status = 'active';
end;
$$;

revoke execute on function public.cancel_membership_plan_change() from public, anon;
grant execute on function public.cancel_membership_plan_change() to authenticated;

-- "Visits this month": reservas del mes sin un day pass pagado detrás —
-- mismo criterio "day pass vs visita de membresía" que ya usan Epic 7/8
-- (pago `succeeded` ligado = day pass). `p_month` es el "hoy" de mockup
-- (`TODAY` en `src/lib/availability.ts`), igual que `confirm_booking`
-- recibe `p_date`. SECURITY INVOKER: RLS de `bookings`/`payments` ya limita
-- a las filas propias.
create or replace function public.membership_visits_in_month(p_month date)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.bookings b
  where b.member_id = (select auth.uid())
    and date_trunc('month', b.date) = date_trunc('month', p_month)
    and b.status in ('confirmed', 'in_progress', 'completed')
    and not exists (
      select 1 from public.payments p
      where p.booking_id = b.id and p.status = 'succeeded'
    )
    -- Pagada con un day pass de regalo: no gasta visita incluida
    -- (booking_coverage.sql).
    and not exists (
      select 1 from public.day_pass_redemptions r where r.booking_id = b.id
    );
$$;

/* -------------------------------------------------------------------- */
/* Cron diario: vencimientos, cobro de renovaciones y aviso previo      */
/* -------------------------------------------------------------------- */

-- Tres tareas, en este orden:
--   1. Vence los términos acabados SIN auto-renovación.
--   2. Cobra los términos acabados CON auto-renovación: una llamada (pg_net)
--      a la Edge Function `membership-renewal` con `type: "charge"` por
--      cada uno — `renewal_attempted_at` evita un segundo cobro si el cron
--      vuelve a correr antes de que la function termine. La function cobra
--      off-session la tarjeta guardada; el trigger de `payments` abre el
--      término siguiente, o la function vence la membresía si no pudo cobrar.
--   3. "Renewal date: auto-renewal settings, notice a month in advance"
--      (flow, rama del plan anual) / `Main.dc.html` "We email you on
--      October 3 — a month before": notificación real en la app + email
--      (`type: "notice"`). Tercer tipo de notificación de Epic 6 que pasa a
--      tener un evento real ("Membership renewal reminders").
-- Mismo patrón Vault + pg_net que `booking_reminders.sql`. Sin los dos
-- secretos no se cobra ni se manda email (un término vencido con
-- auto-renovación sigue activo hasta que existan); los vencimientos (1) y la
-- notificación en la app (3) no dependen de Vault.
create or replace function public.dispatch_membership_renewals()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_membership record;
begin
  update public.memberships
  set status = 'expired', updated_at = now()
  where status = 'active' and not auto_renew and current_period_end <= now();

  -- PAY-02: un cobro de renovación que no se resolvió (error de Stripe, de
  -- red, de Vault…) no deja la membresía activa para siempre. Se reintenta
  -- una vez al día (abajo) y, pasados 3 días de gracia, se vence.
  update public.memberships
  set status = 'expired', updated_at = now()
  where status = 'active' and current_period_end <= now() - interval '3 days';

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'membership_renewal_webhook_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'membership_renewal_webhook_secret';

  if v_url is not null and v_secret is not null then
    for v_membership in
      select m.*
      from public.memberships m
      where m.status = 'active'
        and m.auto_renew
        and m.current_period_end <= now()
        and (m.renewal_attempted_at is null or m.renewal_attempted_at < now() - interval '20 hours')
    loop
      update public.memberships set renewal_attempted_at = now() where member_id = v_membership.member_id;

      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('type', 'charge', 'record', to_jsonb(v_membership)),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 30000
      );
    end loop;
  end if;

  for v_membership in
    select m.*
    from public.memberships m
    where m.status = 'active'
      and m.plan = 'annual'
      and m.auto_renew
      and m.renewal_notice_sent_at is null
      and m.current_period_end between now() and now() + interval '30 days'
  loop
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_membership.member_id, 'membership', 'membership',
      'Your membership renews on ' || to_char(v_membership.current_period_end at time zone 'UTC', 'FMMonth FMDD, YYYY'),
      case when v_membership.pending_plan = 'monthly'
        then 'Your annual term ends then and you move to the monthly plan, $249.00 a month — manage it from Profile › Membership.'
        else 'Nothing to do unless you want to change the plan or the card — manage it from Profile › Membership.'
      end
    );

    if v_url is not null and v_secret is not null then
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('type', 'notice', 'record', to_jsonb(v_membership)),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 15000
      );
    end if;

    update public.memberships set renewal_notice_sent_at = now() where member_id = v_membership.member_id;
  end loop;
end;
$$;

revoke execute on function public.dispatch_membership_renewals() from public, anon, authenticated;

select cron.schedule(
  'dispatch-membership-renewals',
  '0 9 * * *',
  $$select public.dispatch_membership_renewals();$$
);
