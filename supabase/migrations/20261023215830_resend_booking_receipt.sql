SET local check_function_bodies = off;

ALTER TABLE "public"."bookings"
  ADD COLUMN "receipt_requested_at" timestamp WITH time zone;

CREATE OR REPLACE FUNCTION public.booking_reference (
  p_booking_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare
  v_seed text := p_booking_id::text;
  v_hash integer := 0;
begin
  for i in 1..length(v_seed) loop
    v_hash := (v_hash * 31 + ascii(substr(v_seed, i, 1))) % 900000;
  end loop;

  return 'LP-' || (100000 + v_hash)::text;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_booking (
  p_booking_id uuid,
  p_today      date
)
  RETURNS public.bookings
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_member_id uuid := auth.uid();
  v_booking public.bookings;
  v_hours_until_arrival integer;
  v_fee_cents integer := null;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.member_id = v_member_id
  for update;

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'Booking cannot be cancelled from status %', v_booking.status;
  end if;

  if v_booking.status = 'confirmed' then
    -- PAY-05: el plazo lo mide el reloj del servidor (hora de Nueva York, la
    -- de los lounges); `p_today` del cliente se ignora para que una
    -- cancelación tardía no pase por gratuita (y reembolsable).
    v_hours_until_arrival := greatest(v_booking.date - (now() at time zone 'America/New_York')::date, 0) * 24;
    if v_hours_until_arrival < 24 then
      v_fee_cents := 3500;
    end if;
  end if;

  update public.bookings b
    set status = 'cancelled', cancelled_at = now(), cancellation_fee_cents = v_fee_cents, updated_at = now()
    where b.id = p_booking_id
    returning b.* into v_booking;

  return v_booking;
end;
$function$;

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
  v_booking public.bookings;
  v_coverage record;
begin
  if v_member_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Story 10.4 — un lounge en draft, suspendido o archivado no acepta
  -- reservas nuevas (las ya hechas siguen valiendo).
  if not exists (select 1 from public.lounges l where l.id = p_lounge_id and l.content_status = 'live') then
    raise exception 'This lounge is not taking bookings';
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
    -- `for update`: dos confirmaciones simultáneas con el mismo pago se
    -- ponen en fila; la segunda ya lo ve con `booking_id` (E2E-01).
    perform 1 from public.payments p
    where p.id = p_payment_id
      and p.member_id = v_member_id
      and p.booking_id is null
      and p.membership_plan is null
      and p.status in ('pending', 'succeeded')
    for update;
    if not found then
      raise exception 'Invalid payment for this booking';
    end if;
  end if;

  if not public.lounge_band_is_open(p_lounge_id, p_date, p_band) then
    raise exception 'No availability window for % on % (%)', p_lounge_id, p_date, p_band;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_lounge_id || '|' || p_date::text || '|' || p_band));

  if public.lounge_seats_left(p_lounge_id, p_date, p_band) <= 0 then
    return;
  end if;

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

  -- Story 10.4 — un lounge en draft, suspendido o archivado no acepta
  -- reservas nuevas (las ya hechas siguen valiendo).
  if not exists (select 1 from public.lounges l where l.id = p_lounge_id and l.content_status = 'live') then
    raise exception 'This lounge is not taking bookings';
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

CREATE OR REPLACE FUNCTION public.notify_booking_receipt_requested()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
begin
  if new.receipt_requested_at is not distinct from old.receipt_requested_at then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'booking_receipt_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'booking_receipt_webhook_secret';

  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('type', 'RESEND', 'resend', true, 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 15000
  );

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
    emergency_contact text,
    visit_type        text
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
      -- PRIV-01: sin "Share your details with the lounge", solo el código.
      case when coalesce(p.privacy_share_with_lounge, true) then coalesce(p.full_name, split_part(u.email::text, '@', 1)) else 'Private guest' end,
      case when b.status <> 'cancelled' and coalesce(p.privacy_share_with_lounge, true) then u.email::text end,
      case when b.status <> 'cancelled' and coalesce(p.privacy_share_with_lounge, true) then p.phone end,
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
        when b.status <> 'cancelled' and coalesce(p.privacy_share_with_lounge, true) and p.emergency_contact_name is not null and p.emergency_contact_phone is not null
          then p.emergency_contact_name
            || coalesce(' · ' || nullif(p.emergency_contact_relation, ''), '')
            || ' · ' || p.emergency_contact_phone
        else null
      end,
      public.booking_visit_type(b.id)
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

CREATE OR REPLACE FUNCTION public.reception_checkin_booking (
  p_lounge_id         text,
  p_date              date,
  p_confirmation_code text
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
    where b.lounge_id = p_lounge_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and b.date = p_date
      and b.confirmation_code = upper(trim(p_confirmation_code))
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'No confirmed booking for % at % on %, or it is already checked in', p_confirmation_code, p_lounge_id, p_date;
  end if;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reception_lookup_booking (
  p_lounge_id         text,
  p_date              date,
  p_confirmation_code text
)
  RETURNS TABLE (
    id                         uuid,
    confirmation_code          text,
    member_name                text,
    member_email               text,
    slot_time                  text,
    special_requests           text,
    status                     text,
    checked_in_at              timestamp with time zone,
    no_show                    boolean,
    emergency_contact_name     text,
    emergency_contact_relation text,
    emergency_contact_phone    text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings;
begin
  select b.* into v_booking
  from public.bookings b
  where b.lounge_id = p_lounge_id
    and b.lounge_id in (select public.partner_lounge_ids())
    and b.date = p_date
    and b.confirmation_code = upper(trim(p_confirmation_code))
    and b.status <> 'cancelled';

  if v_booking.id is null then
    return;
  end if;

  return query
    select
      v_booking.id,
      v_booking.confirmation_code,
      -- PRIV-01: con "Share your details with the lounge" apagado se
      -- entra solo con el código ("check in by number only").
      case when coalesce(p.privacy_share_with_lounge, true) then coalesce(p.full_name, split_part(u.email::text, '@', 1)) else 'Private guest' end,
      case when coalesce(p.privacy_share_with_lounge, true) then u.email::text end,
      v_booking.slot_time,
      v_booking.special_requests,
      v_booking.status,
      v_booking.checked_in_at,
      v_booking.no_show,
      case when coalesce(p.privacy_share_with_lounge, true) then p.emergency_contact_name end,
      case when coalesce(p.privacy_share_with_lounge, true) then p.emergency_contact_relation end,
      case when coalesce(p.privacy_share_with_lounge, true) then p.emergency_contact_phone end
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = v_booking.member_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reception_report_no_show (
  p_lounge_id         text,
  p_date              date,
  p_confirmation_code text
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
    set no_show = true, status = 'completed', cancellation_fee_cents = 3500, updated_at = now()
    where b.lounge_id = p_lounge_id
      and b.lounge_id in (select public.partner_lounge_ids())
      and b.date = p_date
      and b.confirmation_code = upper(trim(p_confirmation_code))
      and b.status = 'confirmed'
      and b.checked_in_at is null
    returning b.* into v_booking;

  if v_booking.id is null then
    raise exception 'No confirmed booking for % at % on %, or it already checked in', p_confirmation_code, p_lounge_id, p_date;
  end if;

  return v_booking;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reception_today_summary (
  p_lounge_id text,
  p_date      date
)
  RETURNS TABLE (
    expected   integer,
    checked_in integer
  )
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    count(*) filter (where status <> 'cancelled')::int,
    count(*) filter (where checked_in_at is not null)::int
  from public.bookings
  where lounge_id = p_lounge_id and date = p_date
    and lounge_id in (select public.partner_lounge_ids());
$function$;

CREATE OR REPLACE FUNCTION public.resend_booking_receipt (
  p_booking_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.member_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  if v_booking.status not in ('confirmed', 'in_progress', 'completed') then
    raise exception 'This booking has no receipt to send' using errcode = 'P0001';
  end if;

  if v_booking.receipt_requested_at > now() - interval '5 minutes' then
    raise exception 'Receipt already sent — try again in a few minutes' using errcode = 'P0001';
  end if;

  update public.bookings set receipt_requested_at = now() where id = p_booking_id;
end;
$function$;

CREATE TRIGGER booking_receipt_requested_send
  AFTER UPDATE OF receipt_requested_at ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_receipt_requested();

REVOKE ALL ON FUNCTION "public"."notify_booking_receipt_requested"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."notify_booking_receipt_requested"() TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."resend_booking_receipt"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."resend_booking_receipt"(uuid) TO "authenticated", "postgres", "service_role";
