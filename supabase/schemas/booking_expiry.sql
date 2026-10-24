-- Story 5.1 — "Booking expires automatically after booking window". Al
-- acabar la ventana (llegada + 4 h, `VISIT_WINDOW_HOURS` de
-- `src/lib/passes.ts`) en el huso del lounge, `pg_cron` cierra la reserva:
-- con check-in pasa a `completed`; sin él, a `completed` + `no_show`. Sin fee
-- (decisión del usuario, 23 oct 2026): el de $35 solo lo registra quien
-- reporta el no-show, así que tampoco se abre caso de soporte
-- (`open_support_ticket_for_no_show` exige fee).
create or replace function public.booking_window_end(p_date date, p_slot_time text, p_timezone text)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((p_date::timestamp + p_slot_time::time) + interval '4 hours') at time zone p_timezone;
$$;

create or replace function public.expire_finished_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings b
  set status = 'completed',
      no_show = (b.checked_in_at is null),
      updated_at = now()
  from public.lounges l
  where l.id = b.lounge_id
    and b.status in ('confirmed', 'in_progress')
    and public.booking_window_end(b.date, b.slot_time, l.timezone) <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.expire_finished_bookings() from public, anon, authenticated;

select cron.schedule(
  'expire-finished-bookings',
  '*/15 * * * *',
  $$select public.expire_finished_bookings();$$
);
