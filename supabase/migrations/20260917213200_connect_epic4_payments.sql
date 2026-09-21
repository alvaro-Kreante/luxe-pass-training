SET local check_function_bodies = off;

DROP FUNCTION "public"."confirm_booking"(text, date, text, text, text);

CREATE TABLE "public"."payments" (
  "id"                         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "member_id"                  uuid                     NOT NULL,
  "booking_id"                 uuid,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id"   text,
  "amount_cents"               integer                  NOT NULL,
  "currency"                   text                     NOT NULL DEFAULT 'usd'::text,
  "status"                     text                     NOT NULL DEFAULT 'pending'::text,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "payments_amount_cents_check" CHECK ((amount_cents >= 0)),
  CONSTRAINT "payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text]))),
  CONSTRAINT "payments_stripe_checkout_session_id_key" UNIQUE (stripe_checkout_session_id),
  CONSTRAINT "payments_stripe_payment_intent_id_key" UNIQUE (stripe_payment_intent_id)
);

ALTER TABLE "public"."payments"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles"
  ADD COLUMN "stripe_customer_id" text;

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
$function$;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_member_id_fkey" FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_stripe_customer_id_key" UNIQUE (stripe_customer_id);

CREATE POLICY "select own payments" ON "public"."payments"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = member_id));

GRANT EXECUTE ON FUNCTION "public"."confirm_booking"(text, date, text, text, text, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payments" TO "anon", "authenticated", "postgres", "service_role";
