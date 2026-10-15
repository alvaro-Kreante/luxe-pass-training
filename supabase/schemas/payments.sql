-- Story 4.2 — nace aquí, dueño Epic 4 (ver docs/DATA-MODEL-MAP.md). Ledger
-- de pagos reales vía Stripe. `status` lo escribe únicamente el webhook de
-- Stripe (fuente de verdad, nunca el cliente tras el submit) — mismo
-- principio que ya sigue Brevo con el Auth Hook. `booking_id` se rellena
-- cuando la reserva ligada a este pago se crea de verdad (puede ser antes o
-- después del pago según la arquitectura final de la Story 4.2, todavía en
-- diseño al escribir este schema).
--
-- Importes en centavos (`amount_cents`), la unidad nativa de la API de
-- Stripe — evita redondeos de coma flotante al comparar contra lo que
-- Stripe reporta.
create table if not exists public.payments (
  id                          uuid primary key default gen_random_uuid(),
  member_id                   uuid not null references auth.users (id) on delete cascade,
  booking_id                  uuid references public.bookings (id) on delete set null,
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text unique,
  amount_cents                integer not null check (amount_cents >= 0),
  currency                    text not null default 'usd',
  status                      text not null default 'pending' check (
    status in ('pending', 'succeeded', 'failed', 'refunded')
  ),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  -- Story 8.1 (Epic 8) — "Refund processing interface", reembolso real vía
  -- Stripe (Edge Function `stripe-refund-payment`). `refunded_amount_cents`
  -- puede ser menor que `amount_cents` (reembolso parcial) — `status` solo
  -- pasa a 'refunded' cuando el reembolso cubre el importe completo, igual
  -- criterio que Stripe usa para `charge.refunded`.
  refunded_amount_cents       integer check (refunded_amount_cents is null or refunded_amount_cents >= 0),
  refunded_at                 timestamptz,
  refund_reason               text,
  stripe_refund_id            text unique,
  -- Story 9.1 (Epic 9) — el pago es la compra de un plan de membresía (alta
  -- o subida mensual → anual), no un day pass. Cuando `status` pasa a
  -- 'succeeded', el trigger `apply_membership_payment` (memberships.sql)
  -- activa o cambia el plan — nunca el cliente.
  membership_plan             text check (membership_plan in ('monthly', 'annual'))
);

alter table public.payments enable row level security;

create policy "select own payments"
on public.payments for select
to authenticated
using ( (select auth.uid()) = member_id );

-- Sin policies de insert/update/delete: la fila la crea la Edge Function que
-- arranca el pago (service role) y el estado lo actualiza el webhook de
-- Stripe (service role, bypassa RLS) — un miembro nunca escribe esta tabla
-- directamente.

-- Story 4.2 — el webhook de Stripe traduce los eventos de una Checkout
-- Session (tarjeta nueva) a esta función; nadie más la llama.
--   - PAY-01: al cobrarse guarda el `payment_intent` de la sesión, para que
--     `stripe-refund-payment` y los eventos `payment_intent.*`/`charge.*`
--     encuentren la fila.
--   - Solo sale de 'pending': un evento tardío o repetido no deshace un pago
--     ya cobrado ni reembolsado.
create or replace function public.settle_checkout_session(
  p_session_id text,
  p_outcome text,
  p_payment_intent_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_outcome not in ('succeeded', 'failed') then
    raise exception 'Invalid outcome %', p_outcome;
  end if;

  update public.payments p
    set status = p_outcome,
        stripe_payment_intent_id = coalesce(p_payment_intent_id, p.stripe_payment_intent_id),
        updated_at = now()
    where p.stripe_checkout_session_id = p_session_id
      and p.status = 'pending';
end;
$$;

revoke execute on function public.settle_checkout_session(text, text, text) from public, anon, authenticated;
grant execute on function public.settle_checkout_session(text, text, text) to service_role;

-- SEC-02 — `confirm_booking` acepta un pago aún 'pending' (con tarjeta nueva
-- el webhook puede llegar después de la reserva). Si ese pago acaba
-- 'failed' (sesión caducada sin pagar, rechazo), la reserva que se confirmó
-- con él se cancela sin fee: sin esto, reservar sin pagar salía gratis.
create or replace function public.cancel_booking_of_failed_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bookings b
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where b.id = new.booking_id
      and b.status in ('confirmed', 'waitlisted');
  return new;
end;
$$;

revoke execute on function public.cancel_booking_of_failed_payment() from public, anon, authenticated;

create or replace trigger cancel_booking_of_failed_payment
after update of status on public.payments
for each row
when (new.status = 'failed' and old.status is distinct from 'failed' and new.booking_id is not null)
execute function public.cancel_booking_of_failed_payment();

-- Story 4.2 — eventos `payment_intent.*` (tarjeta guardada). SEC-04: igual
-- que `settle_checkout_session`, solo saca un pago de 'pending'; un evento
-- tardío o repetido no vuelve a 'succeeded' un pago reembolsado (lo que
-- además reactivaría `apply_membership_payment`) ni marca 'failed' uno ya
-- cobrado. Solo la llama `stripe-webhook`.
create or replace function public.settle_payment_intent(p_payment_intent_id text, p_outcome text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_outcome not in ('succeeded', 'failed') then
    raise exception 'Invalid outcome %', p_outcome;
  end if;

  update public.payments p
    set status = p_outcome, updated_at = now()
    where p.stripe_payment_intent_id = p_payment_intent_id
      and p.status = 'pending';
end;
$$;

revoke execute on function public.settle_payment_intent(text, text) from public, anon, authenticated;
grant execute on function public.settle_payment_intent(text, text) to service_role;

-- Story 8.1 — reembolsos (`stripe-refund-payment` y `charge.refunded`).
-- PAY-04: `p_refunded_total_cents` es el total que dice Stripe
-- (`charge.amount_refunded`), no una suma local; nunca retrocede, así que
-- dos reembolsos a la vez o un evento viejo no lo pisan. Pasa a 'refunded'
-- al cubrir el importe completo. Solo sobre pagos cobrados.
create or replace function public.record_payment_refund(
  p_payment_intent_id text,
  p_refunded_total_cents integer,
  p_refund_id text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments p
    set refunded_amount_cents = greatest(coalesce(p.refunded_amount_cents, 0), p_refunded_total_cents),
        status = case
          when greatest(coalesce(p.refunded_amount_cents, 0), p_refunded_total_cents) >= p.amount_cents then 'refunded'
          else p.status
        end,
        refunded_at = now(),
        refund_reason = coalesce(p_reason, p.refund_reason),
        stripe_refund_id = coalesce(p_refund_id, p.stripe_refund_id),
        updated_at = now()
    where p.stripe_payment_intent_id = p_payment_intent_id
      and p.status in ('succeeded', 'refunded');
end;
$$;

revoke execute on function public.record_payment_refund(text, integer, text, text) from public, anon, authenticated;
grant execute on function public.record_payment_refund(text, integer, text, text) to service_role;

-- PAY-03 — un reembolso completo deshace lo que el pago compró: la reserva
-- pagada se cancela sin fee y la membresía comprada con él vence. Un
-- reembolso parcial (compensación) no toca nada. El premio de referido que
-- ese pago acreditara queda como está: revertirlo es decisión de producto
-- (docs/PENDIENTES.md).
create or replace function public.undo_purchase_of_refunded_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.booking_id is not null then
    update public.bookings b
      set status = 'cancelled', cancelled_at = now(), cancellation_fee_cents = null, updated_at = now()
      where b.id = new.booking_id
        and b.status in ('confirmed', 'waitlisted');
  end if;

  if new.membership_plan is not null then
    update public.memberships m
      set status = 'expired', updated_at = now()
      where m.member_id = new.member_id
        and m.status = 'active';
  end if;

  return new;
end;
$$;

revoke execute on function public.undo_purchase_of_refunded_payment() from public, anon, authenticated;

create or replace trigger undo_purchase_of_refunded_payment
after update of status on public.payments
for each row
when (new.status = 'refunded' and old.status is distinct from 'refunded')
execute function public.undo_purchase_of_refunded_payment();
