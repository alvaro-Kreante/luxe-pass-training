SET local check_function_bodies = off;

ALTER TABLE "public"."payments"
  DROP CONSTRAINT "payments_status_check";

CREATE SEQUENCE "public"."support_ticket_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 4418 CACHE 1 NO CYCLE;

CREATE TABLE "public"."support_ticket_messages" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "ticket_id"  uuid                     NOT NULL,
  "kind"       text                     NOT NULL,
  "author"     text                     NOT NULL,
  "body"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "support_ticket_messages_kind_check"
    CHECK ((kind = ANY (ARRAY['system'::text, 'email-auto'::text, 'member'::text, 'internal-note'::text, 'partner'::text, 'staff-reply'::text]))),
  CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."support_ticket_messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."support_tickets" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "case_number"       text                     NOT NULL DEFAULT ('CS-'::text || (nextval('public.support_ticket_seq'::regclass))::text),
  "member_id"         uuid                     NOT NULL,
  "booking_id"        uuid,
  "subject"           text                     NOT NULL,
  "note"              text                     NOT NULL DEFAULT ''::text,
  "status"            text                     NOT NULL DEFAULT 'new'::text,
  "assigned_admin_id" uuid,
  "resolution_reason" text,
  "resolution_note"   text                     NOT NULL DEFAULT ''::text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at"       timestamp with time zone,
  CONSTRAINT "support_tickets_case_number_key" UNIQUE (case_number),
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY (id),
  CONSTRAINT "support_tickets_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'open'::text, 'waiting'::text, 'escalated'::text, 'resolved'::text])))
);

ALTER TABLE "public"."support_tickets"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payments"
  ADD COLUMN "refunded_amount_cents" integer;

ALTER TABLE "public"."payments"
  ADD COLUMN "refunded_at" timestamp WITH time zone;

ALTER TABLE "public"."payments"
  ADD COLUMN "refund_reason" text;

ALTER TABLE "public"."payments"
  ADD COLUMN "stripe_refund_id" text;

CREATE OR REPLACE FUNCTION public.admin_cancel_booking (
  p_booking_id uuid
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
  v_was_confirmed boolean;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'Booking cannot be cancelled from status %', v_booking.status;
  end if;

  v_was_confirmed := v_booking.status = 'confirmed';

  update public.bookings b
    set status = 'cancelled', cancelled_at = now(), updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  if v_was_confirmed then
    update public.lounge_availability
      set seats_left = seats_left + 1, updated_at = now()
      where lounge_id = v_booking.lounge_id and date = v_booking.date and band = v_booking.band;
  end if;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_member_bookings (
  p_member_id uuid
)
  RETURNS TABLE (
    id                     uuid,
    confirmation_code      text,
    lounge_id              text,
    lounge_name            text,
    lounge_area            text,
    date                   date,
    band                   text,
    slot_time              text,
    status                 text,
    no_show                boolean,
    checked_in_at          timestamp with time zone,
    cancelled_at           timestamp with time zone,
    cancellation_fee_cents integer,
    created_at             timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      b.id, b.confirmation_code, b.lounge_id, l.name, l.neighborhood,
      b.date, b.band, b.slot_time, b.status, b.no_show,
      b.checked_in_at, b.cancelled_at, b.cancellation_fee_cents, b.created_at
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    where b.member_id = p_member_id
    order by b.date desc, b.slot_time desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_member_payments (
  p_member_id uuid
)
  RETURNS TABLE (
    kind                     text,
    id                       uuid,
    booking_id               uuid,
    title                    text,
    detail                   text,
    amount_cents             integer,
    status                   text,
    stripe_payment_intent_id text,
    created_at               timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      'payment'::text,
      p.id,
      p.booking_id,
      case when l.name is not null then l.name || ' · ' || to_char(b.date, 'Mon DD') else 'Day pass' end,
      coalesce(p.stripe_payment_intent_id, p.stripe_checkout_session_id, ''),
      p.amount_cents,
      p.status,
      p.stripe_payment_intent_id,
      p.created_at
    from public.payments p
    left join public.bookings b on b.id = p.booking_id
    left join public.lounges l on l.id = b.lounge_id
    where p.member_id = p_member_id

    union all

    select
      'fee'::text,
      b.id,
      b.id,
      case when b.no_show then 'No-show fee · ' || l.name else 'Late cancellation fee · ' || l.name end,
      to_char(b.date, 'Mon DD'),
      b.cancellation_fee_cents,
      'recorded',
      null,
      coalesce(b.cancelled_at, b.checked_in_at, b.updated_at)
    from public.bookings b
    join public.lounges l on l.id = b.lounge_id
    where b.member_id = p_member_id and b.cancellation_fee_cents is not null

    order by created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_member_profile (
  p_member_id uuid
)
  RETURNS TABLE (
    id                uuid,
    full_name         text,
    email             text,
    phone             text,
    membership_status text,
    deleted_at        timestamp with time zone,
    member_since      timestamp with time zone,
    open_cases_count  integer,
    last_visit_date   date,
    last_visit_lounge text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      u.id,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      p.phone,
      coalesce(p.membership_status, 'active'),
      p.deleted_at,
      p.created_at,
      (
        select count(*)::int from public.support_tickets t
        where t.member_id = u.id and t.status <> 'resolved'
      ),
      (
        select b.date from public.bookings b
        where b.member_id = u.id and b.status <> 'cancelled' and b.status <> 'waitlisted'
        order by b.date desc limit 1
      ),
      (
        select l.name from public.bookings b
        join public.lounges l on l.id = b.lounge_id
        where b.member_id = u.id and b.status <> 'cancelled' and b.status <> 'waitlisted'
        order by b.date desc limit 1
      )
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = p_member_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reschedule_booking (
  p_booking_id uuid,
  p_date       date,
  p_band       text,
  p_slot_time  text,
  p_override   boolean DEFAULT false
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
  v_seats smallint;
  v_was_confirmed boolean;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;
  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'Booking cannot be modified from status %', v_booking.status;
  end if;

  v_was_confirmed := v_booking.status = 'confirmed';

  if not p_override then
    select seats_left into v_seats
    from public.lounge_availability
    where lounge_id = v_booking.lounge_id and date = p_date and band = p_band
    for update;

    if v_seats is null then
      raise exception 'No availability window for % on % (%)', v_booking.lounge_id, p_date, p_band;
    end if;
    if v_seats <= 0 then
      raise exception 'No seats left for % on % (%) — use the override', v_booking.lounge_id, p_date, p_band;
    end if;

    update public.lounge_availability
      set seats_left = seats_left - 1, updated_at = now()
      where lounge_id = v_booking.lounge_id and date = p_date and band = p_band;

    if v_was_confirmed then
      update public.lounge_availability
        set seats_left = seats_left + 1, updated_at = now()
        where lounge_id = v_booking.lounge_id and date = v_booking.date and band = v_booking.band;
    end if;
  end if;

  update public.bookings b
    set date = p_date, band = p_band, slot_time = p_slot_time, status = 'confirmed', updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_search_members (
  p_query text
)
  RETURNS TABLE (
    id                uuid,
    full_name         text,
    email             text,
    phone             text,
    membership_status text,
    deleted_at        timestamp with time zone,
    member_since      timestamp with time zone,
    open_cases_count  integer,
    last_visit_date   date,
    last_visit_lounge text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_trimmed text := trim(p_query);
  v_upper text := upper(trim(p_query));
  v_digits text := regexp_replace(trim(p_query), '\D', '', 'g');
  v_booking_member uuid;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  if v_trimmed = '' then
    return;
  end if;

  if v_upper ~ '^LP-\d+$' then
    select b.member_id into v_booking_member
    from public.bookings b
    where b.confirmation_code = v_upper
    limit 1;

    if v_booking_member is null then
      return;
    end if;

    return query select * from public.admin_member_profile(v_booking_member);
    return;
  end if;

  if length(v_digits) >= 4 then
    return query
      select r.* from auth.users u
      join public.profiles p on p.id = u.id
      cross join lateral public.admin_member_profile(u.id) r
      where regexp_replace(p.phone, '\D', '', 'g') like '%' || v_digits
      limit 25;
    return;
  end if;

  return query
    select r.* from auth.users u
    left join public.profiles p on p.id = u.id
    cross join lateral public.admin_member_profile(u.id) r
    where coalesce(p.full_name, '') ilike '%' || v_trimmed || '%'
       or u.email::text ilike '%' || v_trimmed || '%'
    order by r.member_since desc nulls last
    limit 25;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_waive_booking_fee (
  p_booking_id uuid
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

  update public.bookings b
    set cancellation_fee_cents = null, no_show = false, updated_at = now()
    where b.id = p_booking_id and b.cancellation_fee_cents is not null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found or has no fee to waive';
  end if;

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
  if new.no_show is true and old.no_show is distinct from true then
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

CREATE OR REPLACE FUNCTION public.partner_checkin_booking (
  p_booking_id uuid
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
begin
  update public.bookings b
    set checked_in_at = now(), status = 'in_progress', updated_at = now()
    where b.id = p_booking_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found, not confirmed, already checked in, or not authorized';
  end if;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_guest_list (
  p_lounge_id text,
  p_date      date
)
  RETURNS TABLE (
    id                uuid,
    confirmation_code text,
    member_name       text,
    member_email      text,
    member_phone      text,
    band              text,
    slot_time         text,
    status            text,
    checked_in_at     timestamp with time zone,
    no_show           boolean,
    no_show_reason    text,
    special_requests  text,
    created_at        timestamp with time zone,
    is_day_pass       boolean,
    visit_number      integer,
    emergency_contact text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if p_lounge_id not in (select public.partner_lounge_ids()) then
    raise exception 'Not authorized for lounge %', p_lounge_id;
  end if;

  return query
    select
      b.id,
      b.confirmation_code,
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      case when b.status <> 'cancelled' then u.email::text end,
      case when b.status <> 'cancelled' then p.phone end,
      b.band,
      b.slot_time,
      b.status,
      b.checked_in_at,
      b.no_show,
      b.no_show_reason,
      b.special_requests,
      b.created_at,
      exists (
        select 1 from public.payments pm
        where pm.booking_id = b.id and pm.status = 'succeeded'
      ),
      (
        select count(*)::int from public.bookings b2
        where b2.member_id = b.member_id
          and b2.lounge_id = b.lounge_id
          and b2.status <> 'cancelled'
          and b2.date <= b.date
      ),
      case
        when b.status <> 'cancelled' and p.emergency_contact_name is not null and p.emergency_contact_phone is not null
          then p.emergency_contact_name
            || coalesce(' · ' || nullif(p.emergency_contact_relation, ''), '')
            || ' · ' || p.emergency_contact_phone
        else null
      end
    from public.bookings b
    join auth.users u on u.id = b.member_id
    left join public.profiles p on p.id = b.member_id
    where b.lounge_id = p_lounge_id and b.date = p_date
    order by b.slot_time, b.created_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_report_no_show (
  p_booking_id uuid,
  p_reason     text
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
begin
  if p_reason not in ('never-arrived', 'arrived-after-window', 'something-else') then
    raise exception 'Invalid no-show reason %', p_reason;
  end if;

  update public.bookings b
    set no_show = true, no_show_reason = p_reason, status = 'completed', cancellation_fee_cents = 3500, updated_at = now()
    where b.id = p_booking_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found, not confirmed, already checked in, or not authorized';
  end if;

  return v_booking;
end;
$function$;

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_refunded_amount_cents_check" CHECK (((refunded_amount_cents IS NULL) OR (refunded_amount_cents >= 0)));

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text])));

ALTER TABLE "public"."payments"
  ADD CONSTRAINT "payments_stripe_refund_id_key" UNIQUE (stripe_refund_id);

ALTER TABLE "public"."support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_admin_id_fkey" FOREIGN KEY (assigned_admin_id) REFERENCES auth.users(id);

ALTER TABLE "public"."support_tickets"
  ADD CONSTRAINT "support_tickets_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;

ALTER TABLE "public"."support_tickets"
  ADD CONSTRAINT "support_tickets_member_id_fkey" FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

CREATE TRIGGER booking_no_show_opens_ticket
  AFTER UPDATE OF no_show ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.open_support_ticket_for_no_show();

CREATE POLICY "admin manages support ticket messages" ON "public"."support_ticket_messages"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('admin'::text))
  WITH CHECK (public.has_role('admin'::text));

CREATE POLICY "admin manages support tickets" ON "public"."support_tickets"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('admin'::text))
  WITH CHECK (public.has_role('admin'::text));

GRANT EXECUTE ON FUNCTION "public"."admin_cancel_booking"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_member_bookings"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_member_payments"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_member_profile"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_reschedule_booking"(uuid, date, text, text, boolean) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_search_members"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_waive_booking_fee"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."open_support_ticket_for_no_show"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."open_support_ticket_for_no_show"() TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."support_ticket_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_ticket_messages" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."support_tickets" TO "anon", "authenticated", "postgres", "service_role";
