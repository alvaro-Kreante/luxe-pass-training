SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."booking_coverage"(date) FROM "anon";

REVOKE ALL ON FUNCTION "public"."booking_coverage_for"(uuid, date) FROM "anon";

REVOKE ALL ON FUNCTION "public"."booking_coverage_for"(uuid, date) FROM "authenticated";

CREATE OR REPLACE FUNCTION public.confirm_booking (
  p_lounge_id        text,
  p_date             date,
  p_band             text,
  p_slot_time        text,
  p_special_requests text DEFAULT ''::text,
  p_payment_id       uuid DEFAULT NULL::uuid
)
  RETURNS TABLE (
    id               uuid,
    status           text,
    date             date,
    band             text,
    slot_time        text,
    special_requests text,
    created_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_member_id uuid := auth.uid();
  v_seats smallint;
  v_booking public.bookings;
  v_coverage record;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Epic 9 — quién paga (ver booking_coverage.sql). Antes, sin
  -- `p_payment_id`, la reserva salía gratis sin comprobar nada.
  if p_payment_id is null then
    select * into v_coverage from public.booking_coverage_for(v_member_id, p_date);
    if v_coverage.kind = 'none' then
      raise exception 'Payment required for this booking';
    end if;
  else
    -- Un pago del propio miembro, de un day pass (no de membresía), que aún
    -- no pague otra reserva. 'pending' vale: con tarjeta nueva el webhook de
    -- Stripe puede llegar después de esta llamada (ver summary/page.tsx).
    perform 1 from public.payments p
    where p.id = p_payment_id
      and p.member_id = v_member_id
      and p.booking_id is null
      and p.membership_plan is null
      and p.status in ('pending', 'succeeded');
    if not found then
      raise exception 'Invalid payment for this booking';
    end if;
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
  elsif v_coverage.kind = 'day_pass_credit' then
    insert into public.day_pass_redemptions (member_id, booking_id, source)
    values (v_member_id, v_booking.id, v_coverage.credit_source);
  end if;

  return query
    select
      v_booking.id, v_booking.status, v_booking.date, v_booking.band,
      v_booking.slot_time, v_booking.special_requests, v_booking.created_at;
end;
$function$;
