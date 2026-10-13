SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."admin_set_booking_status"(uuid, text, boolean) FROM "anon";

CREATE OR REPLACE FUNCTION public.partner_undo_booking_status (
  p_booking_id uuid
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
  v_was_no_show boolean;
  v_lounge_name text;
begin
  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.lounge_id in (select public.partner_lounge_ids())
    and b.date between current_date - 1 and current_date + 1
    and ((b.status = 'in_progress' and not b.no_show) or (b.status = 'completed' and b.no_show))
  for update;

  if v_booking.id is null then
    raise exception 'Booking not found, not from today, nothing to undo, or not authorized';
  end if;

  v_was_no_show := v_booking.no_show;

  update public.bookings b
    set status = 'confirmed', checked_in_at = null, no_show = false, no_show_reason = null,
        cancellation_fee_cents = null, updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  if v_was_no_show then
    select l.name into v_lounge_name from public.lounges l where l.id = v_booking.lounge_id;
    insert into public.support_ticket_messages (ticket_id, kind, author, body)
    select t.id, 'partner', coalesce(v_lounge_name, v_booking.lounge_id),
           coalesce(v_lounge_name, v_booking.lounge_id) || ' undid the no-show for ' || v_booking.confirmation_code
             || '. The $35.00 fee was removed.'
    from public.support_tickets t
    where t.booking_id = v_booking.id;
  end if;

  return v_booking;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."partner_undo_booking_status"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."partner_undo_booking_status"(uuid) TO "authenticated", "postgres", "service_role";
