SET local check_function_bodies = off;

CREATE TABLE "public"."bookings" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "member_id"        uuid                     NOT NULL,
  "lounge_id"        text                     NOT NULL,
  "date"             date                     NOT NULL,
  "band"             text                     NOT NULL,
  "slot_time"        text                     NOT NULL,
  "special_requests" text                     NOT NULL DEFAULT ''::text,
  "status"           text                     NOT NULL DEFAULT 'confirmed'::text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bookings_band_check" CHECK ((band = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text, 'late'::text]))),
  CONSTRAINT "bookings_pkey" PRIMARY KEY (id),
  CONSTRAINT "bookings_slot_time_check" CHECK ((slot_time = ANY (ARRAY['8:00 AM'::text, '10:30 AM'::text, '1:00 PM'::text, '3:30 PM'::text, '6:00 PM'::text]))),
  CONSTRAINT "bookings_special_requests_check" CHECK ((char_length(special_requests) <= 100)),
  CONSTRAINT "bookings_status_check" CHECK ((status = ANY (ARRAY['confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'waitlisted'::text])))
);

ALTER TABLE "public"."bookings"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.confirm_booking (
  p_lounge_id        text,
  p_date             date,
  p_band             text,
  p_slot_time        text,
  p_special_requests text DEFAULT ''::text
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

  return query
    select
      v_booking.id, v_booking.status, v_booking.date, v_booking.band,
      v_booking.slot_time, v_booking.special_requests, v_booking.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.join_waitlist (
  p_lounge_id        text,
  p_date             date,
  p_band             text,
  p_slot_time        text,
  p_special_requests text DEFAULT ''::text
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
$function$;

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_member_id_fkey" FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "select own bookings" ON "public"."bookings"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id));

GRANT EXECUTE ON FUNCTION "public"."confirm_booking"(text, date, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."join_waitlist"(text, date, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."bookings" TO "anon", "authenticated", "postgres", "service_role";
