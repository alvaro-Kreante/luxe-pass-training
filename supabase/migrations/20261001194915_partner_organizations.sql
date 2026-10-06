SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."partner_lounge_ids"() FROM "anon";

REVOKE ALL ON TABLE "public"."partners" FROM "anon";

REVOKE ALL ON TABLE "public"."partners" FROM "authenticated";

DROP POLICY "select own partner lounges" ON "public"."partner_lounges";

DROP POLICY "select own partner account" ON "public"."partners";

DROP POLICY "update own partner details" ON "public"."partners";

DROP TRIGGER "partners_guard_issued_fields" ON "public"."partners";

ALTER TABLE "public"."lounge_partner_invites"
  DROP CONSTRAINT "lounge_partner_invites_lounge_id_fkey";

ALTER TABLE "public"."lounge_partner_invites"
  DROP CONSTRAINT "lounge_partner_invites_partner_id_fkey";

ALTER TABLE "public"."partner_lounges"
  DROP CONSTRAINT "partner_lounges_lounge_id_fkey";

ALTER TABLE "public"."partner_lounges"
  DROP CONSTRAINT "partner_lounges_partner_id_fkey";

ALTER TABLE "public"."partners"
  DROP CONSTRAINT "partners_user_id_fkey";

ALTER TABLE "public"."partners"
  DROP CONSTRAINT "partners_user_id_key";

DROP FUNCTION "public"."admin_lounge_partners"(text);

DROP FUNCTION "public"."partners_guard_issued_fields"();

ALTER TABLE "public"."partners"
  DROP COLUMN "business_name";

ALTER TABLE "public"."partners"
  DROP COLUMN "contact_phone";

ALTER TABLE "public"."partners"
  DROP COLUMN "first_name";

ALTER TABLE "public"."partners"
  DROP COLUMN "last_name";

ALTER TABLE "public"."partners"
  DROP COLUMN "photo_path";

ALTER TABLE "public"."partners"
  DROP COLUMN "user_id";

DROP TABLE "public"."lounge_partner_invites";

DROP TABLE "public"."partner_lounges";

CREATE TABLE "public"."partner_members" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "partner_id"   uuid                     NOT NULL,
  "user_id"      uuid,
  "first_name"   text                     NOT NULL,
  "last_name"    text                     NOT NULL,
  "email"        text                     NOT NULL,
  "mobile"       text                     NOT NULL DEFAULT ''::text,
  "photo_path"   text,
  "suspended_at" timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "partner_members_id_partner_id_key" UNIQUE (id, partner_id),
  CONSTRAINT "partner_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "partner_members_user_id_key" UNIQUE (user_id)
);

ALTER TABLE "public"."partner_members"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lounges"
  ADD COLUMN "partner_id" uuid;

ALTER TABLE "public"."partners"
  ADD COLUMN "name" text NOT NULL;

ALTER TABLE "public"."partners"
  ADD COLUMN "address_line1" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "address_line2" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "city" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "region" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "postal_code" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "country" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "status" text NOT NULL DEFAULT 'draft'::text;

ALTER TABLE "public"."partners"
  ADD COLUMN "representative_id" uuid;

ALTER TABLE "public"."partners"
  ADD COLUMN "activated_at" timestamp WITH time zone;

ALTER TABLE "public"."partners"
  ALTER COLUMN "contact_email" SET DEFAULT ''::text;

CREATE OR REPLACE FUNCTION public.admin_apply_lounge_draft (
  p_lounge_id text,
  p_lounge    jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if coalesce(trim(p_lounge->>'name'), '') = '' then
    raise exception 'A lounge needs a name';
  end if;
  if coalesce(trim(p_lounge->>'address'), '') = '' or p_lounge->>'lat' is null or p_lounge->>'lng' is null then
    raise exception 'A lounge needs an address picked on the map';
  end if;

  update public.lounges l set
    name = trim(p_lounge->>'name'),
    phone = coalesce(trim(p_lounge->>'phone'), ''),
    email = coalesce(trim(p_lounge->>'email'), ''),
    website = coalesce(trim(p_lounge->>'website'), ''),
    address = trim(p_lounge->>'address'),
    neighborhood = coalesce(p_lounge->>'neighborhood', ''),
    city = coalesce(p_lounge->>'city', ''),
    city_id = trim(both '-' from lower(regexp_replace(coalesce(p_lounge->>'city', ''), '[^a-zA-Z0-9]+', '-', 'g'))),
    lat = (p_lounge->>'lat')::double precision,
    lng = (p_lounge->>'lng')::double precision,
    weekly_hours = coalesce(p_lounge->'weekly_hours', '[]'::jsonb),
    closed_weekdays = (select coalesce(array_agg(x::smallint), '{}') from jsonb_array_elements_text(coalesce(p_lounge->'closed_weekdays', '[]'::jsonb)) x),
    hours = coalesce(p_lounge->>'hours', ''),
    amenities = (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(p_lounge->'amenities', '[]'::jsonb)) x),
    capacity = coalesce((p_lounge->>'capacity')::int, 0),
    updated_at = now()
  where l.id = p_lounge_id;

  -- `booking_restrictions` (text[]): el draft las edita desde que el lounge
  -- live ya no tiene editor propio (LoungeDraftPartners.dc.html).
  if p_lounge ? 'booking_restrictions' then
    update public.lounges l set
      booking_restrictions = (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(p_lounge->'booking_restrictions') x)
    where l.id = p_lounge_id;
  end if;

end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_lounge_list()
  RETURNS TABLE (
    id              text,
    name            text,
    area            text,
    capacity        integer,
    content_status  text,
    pending_count   integer,
    photos_count    integer,
    amenities_count integer,
    updated_at      timestamp with time zone,
    city            text,
    created_at      timestamp with time zone
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
      l.id,
      l.name,
      l.neighborhood || ', ' || l.city,
      l.capacity,
      l.content_status,
      (select count(*)::int from public.lounge_content_submissions s where s.lounge_id = l.id and s.status = 'pending'),
      (select count(*)::int from public.lounge_images i where i.lounge_id = l.id),
      array_length(l.amenities, 1),
      l.updated_at,
      l.city,
      l.created_at
    from public.lounges l
    order by l.created_at desc, l.name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_publish_lounge (
  p_lounge_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_lounge public.lounges;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_lounge from public.lounges where id = p_lounge_id and content_status = 'draft' for update;
  if v_lounge.id is null then
    raise exception 'Only drafts can be published';
  end if;

  if trim(v_lounge.name) = '' or trim(v_lounge.phone) = '' or trim(v_lounge.email) = ''
     or trim(v_lounge.address) = ''
     or v_lounge.capacity <= 0
     or not exists (
       select 1 from jsonb_array_elements_text(v_lounge.weekly_hours) h
       where lower(trim(h)) not in ('', 'closed')
     ) then
    raise exception 'This lounge is incomplete and cannot be published yet';
  end if;

  -- Story 10.1 — publicar no invita a nadie: exige un partner activo, que
  -- ya invitó a sus usuarios al activarse (Story 10.4).
  if not exists (
    select 1 from public.partners p
    where p.id = v_lounge.partner_id and p.status = 'active'
  ) then
    raise exception 'A lounge needs an active partner before it can be published';
  end if;

  update public.lounges set content_status = 'live', updated_at = now() where id = p_lounge_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_unpublish_lounge (
  p_lounge_id text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  update public.lounges set content_status = 'draft', updated_at = now()
  where id = p_lounge_id and content_status = 'live';
  if not found then
    raise exception 'Only a live lounge can be moved to draft';
  end if;
end;
$function$;

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
    v_hours_until_arrival := greatest(v_booking.date - p_today, 0) * 24;
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

CREATE OR REPLACE FUNCTION public.dispatch_partner_morning_digest()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_row record;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'partner_digest_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'partner_digest_webhook_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  for v_row in
    select
      m.email as contact_email,
      p.name as business_name,
      l.id as lounge_id,
      l.name as lounge_name,
      count(b.id) filter (where b.status <> 'cancelled')::int as guest_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', coalesce(prof.full_name, split_part(u.email::text, '@', 1)),
            'slot_time', b.slot_time,
            'status', b.status
          )
          order by b.slot_time
        ) filter (where b.status <> 'cancelled'),
        '[]'::jsonb
      ) as guests
    from public.partners p
    join public.partner_members m on m.partner_id = p.id and m.user_id is not null and m.suspended_at is null
    join public.lounges l on l.partner_id = p.id
    left join public.bookings b
      on b.lounge_id = l.id and b.date = (now() at time zone 'UTC')::date
    left join auth.users u on u.id = b.member_id
    left join public.profiles prof on prof.id = b.member_id
    where p.status = 'active'
    group by m.email, p.name, l.id, l.name
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'morning_digest',
        'partner_email', v_row.contact_email,
        'partner_business_name', v_row.business_name,
        'lounge_id', v_row.lounge_id,
        'lounge_name', v_row.lounge_name,
        'date', (now() at time zone 'UTC')::date,
        'guest_count', v_row.guest_count,
        'guests', v_row.guests
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
  end loop;
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

CREATE OR REPLACE FUNCTION public.notify_partner_cancellation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_lounge_name text;
  v_updated_guest_count int;
  v_partner record;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_secret';

  if v_url is null or v_secret is null then
    return new;
  end if;

  select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

  select count(*)::int into v_updated_guest_count
  from public.bookings b
  where b.lounge_id = new.lounge_id and b.date = new.date and b.status <> 'cancelled';

  for v_partner in
    -- Story 10.1 — cada usuario activo del partner del lounge.
    select m.email as contact_email, p.name as business_name
    from public.lounges l
    join public.partners p on p.id = l.partner_id and p.status = 'active'
    join public.partner_members m on m.partner_id = p.id
    where l.id = new.lounge_id and m.user_id is not null and m.suspended_at is null
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'cancellation',
        'record', to_jsonb(new),
        'lounge_name', v_lounge_name,
        'updated_guest_count', v_updated_guest_count,
        'partner_email', v_partner.contact_email,
        'partner_business_name', v_partner.business_name
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
  end loop;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.notify_partner_new_booking()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_url text;
  v_secret text;
  v_lounge_name text;
  v_partner record;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'partner_notification_webhook_secret';

  if v_url is null or v_secret is null then
    return new;
  end if;

  select l.name into v_lounge_name from public.lounges l where l.id = new.lounge_id;

  for v_partner in
    -- Story 10.1 — cada usuario activo del partner del lounge.
    select m.email as contact_email, p.name as business_name
    from public.lounges l
    join public.partners p on p.id = l.partner_id and p.status = 'active'
    join public.partner_members m on m.partner_id = p.id
    where l.id = new.lounge_id and m.user_id is not null and m.suspended_at is null
  loop
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'type', 'new_booking',
        'record', to_jsonb(new),
        'lounge_name', v_lounge_name,
        'partner_email', v_partner.contact_email,
        'partner_business_name', v_partner.business_name
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      timeout_milliseconds := 15000
    );
  end loop;

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

CREATE OR REPLACE FUNCTION public.partner_lounge_ids()
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select l.id
  from public.partner_members m
  join public.partners p on p.id = m.partner_id and p.status = 'active'
  join public.lounges l on l.partner_id = p.id
  where m.user_id = (select auth.uid()) and m.suspended_at is null
  order by l.id;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_default_representative()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.partners p set representative_id = new.id, updated_at = now()
  where p.id = new.partner_id and p.representative_id is null;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_guard_issued_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is not null
     and not public.has_role('admin')
     and (new.email is distinct from old.email
          or new.partner_id is distinct from old.partner_id
          or new.user_id is distinct from old.user_id
          or new.suspended_at is distinct from old.suspended_at) then
    raise exception 'The work email is issued by En Soleil and cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_keep_representative()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (select 1 from public.partners p where p.id = old.partner_id and p.representative_id = old.id)
     and exists (select 1 from public.partner_members m where m.partner_id = old.partner_id and m.id <> old.id) then
    raise exception 'Choose a new representative before deleting this user';
  end if;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.partner_members_require_new_email()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (select 1 from auth.users u where lower(u.email) = lower(trim(new.email))) then
    raise exception '% is already in use', lower(trim(new.email));
  end if;
  new.email := lower(trim(new.email));
  return new;
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
      coalesce(p.full_name, split_part(u.email::text, '@', 1)),
      u.email::text,
      v_booking.slot_time,
      v_booking.special_requests,
      v_booking.status,
      v_booking.checked_in_at,
      v_booking.no_show,
      p.emergency_contact_name,
      p.emergency_contact_relation,
      p.emergency_contact_phone
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
  where lounge_id = p_lounge_id and date = p_date;
$function$;

ALTER TABLE "public"."lounges"
  ADD CONSTRAINT "lounges_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE RESTRICT;

ALTER TABLE "public"."partner_members"
  ADD CONSTRAINT "partner_members_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;

ALTER TABLE "public"."partner_members"
  ADD CONSTRAINT "partner_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."partners"
  ADD CONSTRAINT "partners_name_check" CHECK ((TRIM(BOTH FROM name) <> ''::text));

ALTER TABLE "public"."partners"
  ADD CONSTRAINT "partners_representative_fkey" FOREIGN KEY (representative_id, id) REFERENCES public.partner_members(id, partner_id) ON DELETE SET NULL (representative_id);

ALTER TABLE "public"."partners"
  ADD CONSTRAINT "partners_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'suspended'::text])));

CREATE INDEX lounges_partner_id_idx ON public.lounges USING btree (partner_id);

CREATE UNIQUE INDEX partner_members_email_key ON public.partner_members USING btree (lower(email));

CREATE INDEX partner_members_partner_id_idx ON public.partner_members USING btree (partner_id);

CREATE TRIGGER partner_members_default_representative
  AFTER INSERT ON public.partner_members
  FOR EACH ROW
  EXECUTE FUNCTION public.partner_members_default_representative();

CREATE TRIGGER partner_members_guard_issued_fields
  BEFORE UPDATE ON public.partner_members
  FOR EACH ROW
  EXECUTE FUNCTION public.partner_members_guard_issued_fields();

CREATE TRIGGER partner_members_keep_representative
  BEFORE DELETE ON public.partner_members
  FOR EACH ROW
  EXECUTE FUNCTION public.partner_members_keep_representative();

CREATE TRIGGER partner_members_require_new_email
  BEFORE INSERT ON public.partner_members
  FOR EACH ROW
  EXECUTE FUNCTION public.partner_members_require_new_email();

CREATE POLICY "admins read partner members" ON "public"."partner_members"
  FOR SELECT
  TO "authenticated"
  USING (public.has_role('admin'::text));

CREATE POLICY "read own partner membership" ON "public"."partner_members"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "update own partner details" ON "public"."partner_members"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "members read own partner" ON "public"."partners"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.partner_members m
  WHERE ((m.partner_id = partners.id) AND (m.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "read partner of a live lounge" ON "public"."partners"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.lounges l
  WHERE ((l.partner_id = partners.id) AND (l.content_status = 'live'::text)))));

REVOKE ALL ON FUNCTION "public"."partner_lounge_ids"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "public"."partner_members_default_representative"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."partner_members_default_representative"() TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."partner_members_guard_issued_fields"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."partner_members_keep_representative"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."partner_members_keep_representative"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."partner_members_require_new_email"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."partner_members_require_new_email"() TO "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."partner_members" TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ("id") ON TABLE "public"."partners" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."partners" TO "authenticated";

REVOKE ALL ("name") ON TABLE "public"."partners" FROM "authenticated";

GRANT SELECT ("name") ON TABLE "public"."partners" TO "authenticated";

REVOKE ALL ("status") ON TABLE "public"."partners" FROM "authenticated";

GRANT SELECT ("status") ON TABLE "public"."partners" TO "authenticated";
