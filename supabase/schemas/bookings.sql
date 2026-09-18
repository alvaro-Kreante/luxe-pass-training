-- Story 4.1 — nace aquí, dueña del Epic 4 (ver docs/DATA-MODEL-MAP.md). El
-- dominio de `status` ya incluye los valores que Epic 5/6 asignarán más
-- adelante (in_progress/completed/cancelled) para no tener que ampliar este
-- CHECK cuando esos epics se conecten a su vez — Story 4.1 solo produce
-- 'confirmed'/'waitlisted'.
--
-- `slot_time` en vez de `time` (palabra reservada de Postgres, rompe el
-- parser de pg-delta al usarse como nombre de columna/campo de record).
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references auth.users (id) on delete cascade,
  lounge_id         text not null references public.lounges (id) on delete cascade,
  date              date not null,
  band              text not null check (band in ('morning', 'afternoon', 'evening', 'late')),
  slot_time         text not null check (
    slot_time in ('8:00 AM', '10:30 AM', '1:00 PM', '3:30 PM', '6:00 PM')
  ),
  special_requests  text not null default '' check (char_length(special_requests) <= 100),
  status            text not null default 'confirmed' check (
    status in ('confirmed', 'in_progress', 'completed', 'cancelled', 'waitlisted')
  ),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "select own bookings"
on public.bookings for select
to authenticated
using ( (select auth.uid()) = member_id );

-- Sin policies de insert/update/delete: la tabla solo se toca vía las dos
-- funciones de abajo (SECURITY DEFINER), igual que `login_attempts` en la
-- Story 1.2 — `confirm_booking` necesita decrementar
-- `lounge_availability.seats_left` en la misma transacción que inserta la
-- reserva, y un miembro no tiene (ni debe tener) permiso de escritura
-- directo sobre esa tabla de Epic 3.

-- AC "Final availability check before one-tap confirmation". Bloquea la
-- fila de `lounge_availability` con `for update` para que dos
-- confirmaciones concurrentes sobre el mismo lounge/fecha/franja no
-- decrementen ambas la misma última plaza. Si no quedan plazas, no inserta
-- nada y devuelve cero filas — el cliente lo lee como "full" y ofrece la
-- waitlist (AC "If full, option to be on the waitlist") sin crear una
-- reserva que el miembro todavía no pidió.
--
-- `p_payment_id` (Story 4.2) — se pasa cuando el pago ya se cobró de verdad
-- (Stripe confirmado en el cliente antes de esta llamada, ver
-- `CLAUDE.md` §Procesamiento de pagos): liga `payments.booking_id` a la
-- reserva recién creada, en la misma transacción. `null` cuando la visita
-- está cubierta por la membresía (sin pago que ligar).
create or replace function public.confirm_booking(
  p_lounge_id text,
  p_date date,
  p_band text,
  p_slot_time text,
  p_special_requests text default '',
  p_payment_id uuid default null
)
returns table (
  id uuid,
  status text,
  date date,
  band text,
  slot_time text,
  special_requests text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_seats smallint;
  v_booking public.bookings;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  select la.seats_left into v_seats
  from public.lounge_availability la
  where la.lounge_id = p_lounge_id and la.date = p_date and la.band = p_band
  for update;

  if v_seats is null then
    raise exception 'No availability window for % on % (%)', p_lounge_id, p_date, p_band;
  end if;

  if v_seats <= 0 then
    return;
  end if;

  update public.lounge_availability la
    set seats_left = la.seats_left - 1, updated_at = now()
    where la.lounge_id = p_lounge_id and la.date = p_date and la.band = p_band;

  insert into public.bookings as b
    (member_id, lounge_id, date, band, slot_time, special_requests, status)
  values
    (v_member_id, p_lounge_id, p_date, p_band, p_slot_time, coalesce(p_special_requests, ''), 'confirmed')
  returning b.* into v_booking;

  if p_payment_id is not null then
    update public.payments p
      set booking_id = v_booking.id, updated_at = now()
      where p.id = p_payment_id and p.member_id = v_member_id;
  end if;

  return query
    select
      v_booking.id, v_booking.status, v_booking.date, v_booking.band,
      v_booking.slot_time, v_booking.special_requests, v_booking.created_at;
end;
$$;

grant execute on function public.confirm_booking(text, date, text, text, text, uuid) to authenticated;

-- Solo se llama cuando el miembro elige "Join the waitlist" en
-- `Waitlist.dc.html` tras un `confirm_booking` que devolvió cero filas — no
-- consume plaza de `lounge_availability` (la waitlist no reserva inventario
-- real, ninguna historia lo pide).
create or replace function public.join_waitlist(
  p_lounge_id text,
  p_date date,
  p_band text,
  p_slot_time text,
  p_special_requests text default ''
)
returns table (
  id uuid,
  status text,
  date date,
  band text,
  slot_time text,
  special_requests text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := auth.uid();
  v_booking public.bookings;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.bookings as b
    (member_id, lounge_id, date, band, slot_time, special_requests, status)
  values
    (v_member_id, p_lounge_id, p_date, p_band, p_slot_time, coalesce(p_special_requests, ''), 'waitlisted')
  returning b.* into v_booking;

  return query
    select
      v_booking.id, v_booking.status, v_booking.date, v_booking.band,
      v_booking.slot_time, v_booking.special_requests, v_booking.created_at;
end;
$$;

grant execute on function public.join_waitlist(text, date, text, text, text) to authenticated;
