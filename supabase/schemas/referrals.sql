-- Story 9.2 — Referral Program. Nace aquí, dueña Epic 9 (ver
-- docs/DATA-MODEL-MAP.md). Decisiones confirmadas con el usuario (23 sept
-- 2026, ver docs/design/COMPONENT-MAP.md "Backend real — Epic 9"):
--
--   - El amigo entra por `/join/[code]` → `/signup?ref=CODE`; el código
--     viaja en los metadatos de Auth (`raw_user_meta_data.referral_code`),
--     igual que `terms_accepted_at` desde la Story 1.1. La fila de
--     `referrals` nace al crear su perfil (fin de /onboarding).
--   - Premio 'pending' desde el alta; 'credited' con el PRIMER pago real
--     liquidado del amigo (`payments.status = 'succeeded'`, lo decide el
--     webhook de Stripe) — Terms §3.
--
-- `raw_user_meta_data` es editable por el propio usuario: aquí solo se usa
-- como dato de entrada (qué código escribió), nunca para autorizar nada.

/* -------------------------------------------------------------------- */
/* AC "Unique referral code generation" — profiles.referral_code        */
/* -------------------------------------------------------------------- */

-- "AR-SOLEIL-24": iniciales + sufijo aleatorio de 2 cifras (el formato de
-- los artboards); si tras varios intentos está todo ocupado para esas
-- iniciales, pasa a 4 cifras. Unicidad real en `profiles.referral_code`.
create or replace function public.generate_referral_code(p_full_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_initials text;
  v_candidate text;
  v_attempt integer := 0;
begin
  select coalesce(nullif(upper(string_agg(left(word, 1), '')), ''), 'LP')
  into v_initials
  from (
    select word
    from regexp_split_to_table(trim(coalesce(p_full_name, '')), '\s+') with ordinality as t(word, n)
    where word ~ '^[A-Za-z]'
    order by n
    limit 2
  ) initials;

  loop
    v_attempt := v_attempt + 1;
    v_candidate := v_initials || '-SOLEIL-' ||
      case when v_attempt <= 30
        then (10 + floor(random() * 90))::integer::text
        else (1000 + floor(random() * 9000))::integer::text
      end;
    exit when not exists (select 1 from public.profiles p where p.referral_code = v_candidate);
  end loop;

  return v_candidate;
end;
$$;

-- El guard de abajo es SECURITY INVOKER y la llama con el rol del miembro
-- en su propio alta de perfil — por eso `authenticated` conserva EXECUTE.
revoke execute on function public.generate_referral_code(text) from public, anon;
grant execute on function public.generate_referral_code(text) to authenticated;

-- Columnas que el miembro no puede escribir aunque "update own profile" le
-- deje actualizar su fila: el código de referido, el espejo de membresía
-- (lo mantiene `memberships`) y el Customer de Stripe (Story 4.2). Las
-- escrituras legítimas llegan desde funciones SECURITY DEFINER o el service
-- role, cuyo `current_user` no es `authenticated`/`anon`. SECURITY INVOKER a
-- propósito: dentro de un DEFINER, `current_user` sería siempre el dueño.
create or replace function public.guard_profile_managed_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.membership_status := 'inactive';
      new.referral_code := null;
      new.stripe_customer_id := null;
    else
      new.membership_status := old.membership_status;
      new.referral_code := old.referral_code;
      new.stripe_customer_id := old.stripe_customer_id;
    end if;
  end if;

  if new.referral_code is null then
    new.referral_code := public.generate_referral_code(new.full_name);
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_profile_managed_columns() from public, anon, authenticated;

drop trigger if exists profile_guard_managed_columns on public.profiles;

create trigger profile_guard_managed_columns
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_managed_columns();

-- Perfiles anteriores a Epic 9 no tienen código todavía: el trigger de
-- arriba se lo asigna en su próximo UPDATE, y esta RPC lo hace al primer
-- vistazo a /profile o /profile/membership.
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select referral_code into v_code from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_code is null then
    update public.profiles set updated_at = now() where id = v_uid returning referral_code into v_code;
  end if;

  return v_code;
end;
$$;

revoke execute on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated;

/* -------------------------------------------------------------------- */
/* AC "Referral tracking and status updates"                            */
/* -------------------------------------------------------------------- */

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles (id) on delete cascade,
  -- Terms §2: "Only the first code entered on an account counts".
  referee_id    uuid not null unique references public.profiles (id) on delete cascade,
  code          text not null,
  -- Instantánea del amigo al registrarse: el referidor no puede leer su
  -- perfil (RLS), y `Referrals.dc.html` solo enseña nombre y email "because
  -- you were the one who sent it".
  referee_name  text not null,
  referee_email text not null,
  status        text not null default 'pending' check (status in ('pending', 'credited')),
  joined_at     timestamptz not null default now(),
  credited_at   timestamptz,
  constraint referrals_not_self check (referrer_id <> referee_id)
);

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

-- El referido también ve su fila: su propio day pass de bienvenida sale de
-- aquí ("you each get a complimentary day pass").
create policy "select own referrals"
on public.referrals for select
to authenticated
using ( (select auth.uid()) = referrer_id or (select auth.uid()) = referee_id );

-- Sin policies de escritura: la fila la crean/actualizan los triggers de
-- abajo (SECURITY DEFINER).

/* AC "Friend's sign up confirmation notification" */
create or replace function public.create_referral_from_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_email text;
  v_referrer uuid;
begin
  select upper(trim(u.raw_user_meta_data ->> 'referral_code')), u.email
  into v_code, v_email
  from auth.users u
  where u.id = new.id;

  if v_code is null or v_code = '' then
    return new;
  end if;

  select p.id into v_referrer
  from public.profiles p
  where p.referral_code = v_code and p.id <> new.id;

  if v_referrer is null then
    return new;
  end if;

  insert into public.referrals (referrer_id, referee_id, code, referee_name, referee_email)
  values (v_referrer, new.id, v_code, new.full_name, coalesce(v_email, ''))
  on conflict (referee_id) do nothing;

  if found then
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_referrer, 'membership', 'membership',
      new.full_name || ' joined',
      'They signed up with ' || v_code || '. Your day pass follows once their first payment settles.'
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.create_referral_from_signup() from public, anon, authenticated;

drop trigger if exists profile_created_create_referral on public.profiles;

create trigger profile_created_create_referral
  after insert on public.profiles
  for each row
  execute function public.create_referral_from_signup();

/* AC "Reward crediting for successful referrals (pending)" */
create or replace function public.credit_referral_on_first_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral public.referrals;
begin
  if new.status <> 'succeeded' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'succeeded' then
    return new;
  end if;

  update public.referrals
  set status = 'credited', credited_at = now()
  where referee_id = new.member_id and status = 'pending'
  returning * into v_referral;

  if found then
    insert into public.notifications (member_id, category, icon, title, body)
    values (
      v_referral.referrer_id, 'membership', 'membership',
      'Your referral day pass is ready',
      split_part(v_referral.referee_name, ' ', 1) || '''s first payment went through, so the pass is now in your account.'
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.credit_referral_on_first_payment() from public, anon, authenticated;

drop trigger if exists payment_settled_credit_referral on public.payments;

create trigger payment_settled_credit_referral
  after insert or update of status on public.payments
  for each row
  execute function public.credit_referral_on_first_payment();

/* -------------------------------------------------------------------- */
/* AC "Easy sharing via social media, email, SMS" — invitaciones enviadas */
/* -------------------------------------------------------------------- */

-- `Share.dc.html` comparte por apps del sistema (Messages, WhatsApp, Email…)
-- sin pedir el email del amigo, así que "Invitations sent" cuenta las veces
-- que el miembro compartió, no destinatarios concretos.
create table if not exists public.referral_shares (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  channel    text not null check (channel in ('messages', 'whatsapp', 'email', 'instagram', 'nearby', 'more', 'copy')),
  created_at timestamptz not null default now()
);

create index if not exists referral_shares_member_id_idx on public.referral_shares (member_id);

alter table public.referral_shares enable row level security;

create policy "select own referral shares"
on public.referral_shares for select
to authenticated
using ( (select auth.uid()) = member_id );

create policy "insert own referral shares"
on public.referral_shares for insert
to authenticated
with check ( (select auth.uid()) = member_id );
