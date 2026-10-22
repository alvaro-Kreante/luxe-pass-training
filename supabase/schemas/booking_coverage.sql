-- Epic 9 × Epic 4 — quién paga una reserva. Decidido con el usuario (23 sept
-- 2026) una vez conectada la membresía real: hasta entonces el flujo de
-- reserva cobraba el day pass a todo el mundo y la variante "cubierta por la
-- membresía" (`MembershipCovered.dc.html`) solo se alcanzaba con `?covered=1`.
--
-- Orden, para la fecha de la reserva:
--   1. Con membresía activa, un day pass de regalo disponible — Terms §4:
--      "Referral passes are additional to the 8 visits included with your
--      membership, and are used before those included visits". El de
--      cumpleaños antes que el de referido: caduca al acabar el mes.
--   2. Con membresía activa, una de las 8 visitas incluidas del mes de la
--      reserva (no del mes de hoy).
--   3. Si no, se paga el day pass (Story 4.2).
-- Sin membresía activa no se usan day passes de regalo: "remain valid for as
-- long as your membership is active" (Terms §4). Con la auto-renovación
-- apagada, una reserva posterior al fin del término tampoco queda cubierta.

-- Qué day pass de regalo pagó qué reserva. Los disponibles se derivan
-- (referidos acreditados + cumpleaños) menos los gastados aquí; cancelar la
-- reserva devuelve el pase (las filas de reservas canceladas no cuentan).
create table if not exists public.day_pass_redemptions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles (id) on delete cascade,
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  source      text not null check (source in ('referral', 'birthday')),
  redeemed_at timestamptz not null default now()
);

create index if not exists day_pass_redemptions_member_id_idx on public.day_pass_redemptions (member_id);

alter table public.day_pass_redemptions enable row level security;

create policy "select own day pass redemptions"
on public.day_pass_redemptions for select
to authenticated
using ( (select auth.uid()) = member_id );

-- Sin policies de escritura: solo `confirm_booking` (SECURITY DEFINER)
-- inserta aquí.

create or replace function public.booking_coverage_for(p_member_id uuid, p_date date)
returns table (
  kind              text,
  plan              text,
  visits_used       integer,
  visits_included   integer,
  credit_source     text,
  credits_available integer,
  renewal_date      timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membership public.memberships;
  v_visits integer;
  v_birthday boolean := false;
  v_referral_earned integer := 0;
  v_referral_used integer := 0;
  v_referral_left integer := 0;
begin
  select count(*)::integer into v_visits
  from public.bookings b
  where b.member_id = p_member_id
    and date_trunc('month', b.date) = date_trunc('month', p_date)
    and b.status in ('confirmed', 'in_progress', 'completed')
    and not exists (select 1 from public.payments p where p.booking_id = b.id and p.status = 'succeeded')
    and not exists (select 1 from public.day_pass_redemptions r where r.booking_id = b.id);

  select * into v_membership
  from public.memberships m
  where m.member_id = p_member_id and m.status = 'active';

  if not found
     or (not v_membership.auto_renew and p_date > (v_membership.current_period_end at time zone 'UTC')::date) then
    return query select 'none'::text, null::text, v_visits, 8, null::text, 0, null::timestamptz;
    return;
  end if;

  select exists (
    select 1 from public.profiles pr
    where pr.id = p_member_id and pr.birth_month = extract(month from p_date)::integer
  ) and not exists (
    select 1
    from public.day_pass_redemptions r
    join public.bookings b on b.id = r.booking_id
    where r.member_id = p_member_id
      and r.source = 'birthday'
      and b.status <> 'cancelled'
      and extract(year from b.date) = extract(year from p_date)
  ) into v_birthday;

  select
    (select count(*) from public.referrals rf where rf.referrer_id = p_member_id and rf.status = 'credited')
    + (select count(*) from public.referrals rf where rf.referee_id = p_member_id and rf.status = 'credited')
  into v_referral_earned;

  select count(*)::integer into v_referral_used
  from public.day_pass_redemptions r
  join public.bookings b on b.id = r.booking_id
  where r.member_id = p_member_id and r.source = 'referral' and b.status <> 'cancelled';

  v_referral_left := greatest(0, v_referral_earned - v_referral_used);

  return query select
    case
      when v_birthday or v_referral_left > 0 then 'day_pass_credit'
      when v_visits < 8 then 'membership'
      else 'none'
    end,
    v_membership.plan,
    v_visits,
    8,
    case when v_birthday then 'birthday' when v_referral_left > 0 then 'referral' end,
    (case when v_birthday then 1 else 0 end) + v_referral_left,
    v_membership.current_period_end;
end;
$$;

-- Interna: recibe cualquier `p_member_id`, así que ni `anon` ni
-- `authenticated` pueden llamarla — el cliente usa `booking_coverage` (abajo).
revoke execute on function public.booking_coverage_for(uuid, date) from public, anon, authenticated;

-- Para pintar el flujo de reserva: la misma decisión que aplicará
-- `confirm_booking`, para el miembro con sesión.
create or replace function public.booking_coverage(p_date date)
returns table (
  kind              text,
  plan              text,
  visits_used       integer,
  visits_included   integer,
  credit_source     text,
  credits_available integer,
  renewal_date      timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  return query select * from public.booking_coverage_for(auth.uid(), p_date);
end;
$$;

revoke execute on function public.booking_coverage(date) from public, anon;
grant execute on function public.booking_coverage(date) to authenticated;

-- Tipo real de una visita, para partner y admin: `day_pass` si hay un pago
-- `succeeded`, `complimentary` si la pagó un day pass de regalo
-- (`day_pass_redemptions`, sin cobro), y si no el plan del miembro
-- (`annual`/`monthly`; `membership` si ya no tiene plan activo).
create or replace function public.booking_visit_type(p_booking_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.payments pm where pm.booking_id = p_booking_id and pm.status = 'succeeded') then
    return 'day_pass';
  end if;
  if exists (select 1 from public.day_pass_redemptions r where r.booking_id = p_booking_id) then
    return 'complimentary';
  end if;
  return coalesce(
    (select m.plan from public.bookings b
     join public.memberships m on m.member_id = b.member_id and m.status = 'active'
     where b.id = p_booking_id),
    'membership'
  );
end;
$$;

-- Interna: la llaman las RPC de partner y admin, que ya autorizan.
revoke execute on function public.booking_visit_type(uuid) from public, anon, authenticated;
