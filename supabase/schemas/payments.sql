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
  stripe_refund_id            text unique
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
