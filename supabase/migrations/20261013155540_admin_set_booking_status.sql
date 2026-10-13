SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."admin_bookings_on"(date) FROM "anon";

CREATE OR REPLACE FUNCTION public.admin_set_booking_status (
  p_booking_id uuid,
  p_status     text,
  p_override   boolean DEFAULT false
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('confirmed', 'checked-in', 'no-show') then
    raise exception 'Unknown status %', p_status;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_booking.status = 'cancelled' and not p_override then
    perform pg_advisory_xact_lock(hashtext(v_booking.lounge_id || '|' || v_booking.date::text || '|' || v_booking.band));
    if public.lounge_seats_left(v_booking.lounge_id, v_booking.date, v_booking.band) <= 0 then
      raise exception 'No seats left for % on % (%) — use the override', v_booking.lounge_id, v_booking.date, v_booking.band;
    end if;
  end if;

  update public.bookings b
    set status = case p_status when 'confirmed' then 'confirmed' when 'checked-in' then 'in_progress' else 'completed' end,
        no_show = p_status = 'no-show',
        no_show_reason = case when p_status = 'no-show' then b.no_show_reason end,
        checked_in_at = case when p_status = 'checked-in' then coalesce(b.checked_in_at, now()) end,
        cancelled_at = null,
        cancellation_fee_cents = case when p_status = 'no-show' and b.no_show then b.cancellation_fee_cents end,
        updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.open_support_ticket_for_no_show()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_lounge_name text;
begin
  -- Solo el no-show que reporta el lounge registra fee; el que marca el
  -- admin (`admin_set_booking_status`, Story 8.4) no abre caso.
  if new.no_show is true and old.no_show is distinct from true and new.cancellation_fee_cents is not null then
    select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

    insert into public.support_tickets (member_id, booking_id, subject, note, status)
    values (
      new.member_id,
      new.id,
      'No-show fee charged — ' || new.confirmation_code,
      coalesce(v_lounge_name, new.lounge_id) || ' reported this booking as a no-show. The flat fee of $35.00 was recorded automatically.',
      'new'
    );
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_set_booking_status"(uuid, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."admin_set_booking_status"(uuid, text, boolean) TO "authenticated", "postgres", "service_role";
