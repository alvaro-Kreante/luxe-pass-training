SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_add_partner_member (
  p_partner_id uuid,
  p_member     jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_email text := lower(coalesce(trim(p_member->>'email'), ''));
  v_id uuid;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  if coalesce(trim(p_member->>'first_name'), '') = '' or coalesce(trim(p_member->>'last_name'), '') = '' then
    raise exception 'A partner user needs a first name, last name and work email';
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'A partner user needs a valid email';
  end if;
  if exists (select 1 from public.partner_members m where lower(m.email) = v_email) then
    raise exception '% is already in use', v_email;
  end if;

  insert into public.partner_members (partner_id, first_name, last_name, email, mobile)
  values (p_partner_id, trim(p_member->>'first_name'), trim(p_member->>'last_name'), v_email, coalesce(trim(p_member->>'mobile'), ''))
  returning id into v_id;
  return v_id;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.admin_apply_partner_details (
  p_partner_id uuid,
  p_partner    jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if coalesce(trim(p_partner->>'name'), '') = '' then
    raise exception 'A partner needs a name';
  end if;

  update public.partners p set
    name = trim(p_partner->>'name'),
    contact_email = lower(coalesce(trim(p_partner->>'contact_email'), '')),
    address_line1 = coalesce(trim(p_partner->>'address_line1'), ''),
    address_line2 = coalesce(trim(p_partner->>'address_line2'), ''),
    city = coalesce(trim(p_partner->>'city'), ''),
    region = coalesce(trim(p_partner->>'region'), ''),
    postal_code = coalesce(trim(p_partner->>'postal_code'), ''),
    country = coalesce(trim(p_partner->>'country'), ''),
    updated_at = now()
  where p.id = p_partner_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_partner (
  p_partner jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_id uuid;
  v_user jsonb;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  if coalesce(trim(p_partner->>'name'), '') = '' then
    raise exception 'A partner needs a name';
  end if;

  insert into public.partners (name, status) values (trim(p_partner->>'name'), 'draft') returning id into v_id;
  perform public.admin_apply_partner_details(v_id, p_partner);
  for v_user in select * from jsonb_array_elements(coalesce(p_partner->'users', '[]'::jsonb)) loop
    perform public.admin_add_partner_member(v_id, v_user);
  end loop;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_partner_member (
  p_member_id uuid
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
  if exists (select 1 from public.partner_members m where m.id = p_member_id and m.user_id is not null) then
    raise exception 'This user already has an account';
  end if;
  delete from public.partner_members where id = p_member_id;
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

CREATE OR REPLACE FUNCTION public.admin_partner_detail (
  p_partner_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_result jsonb;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'contact_email', p.contact_email,
    'address_line1', p.address_line1,
    'address_line2', p.address_line2,
    'city', p.city,
    'region', p.region,
    'postal_code', p.postal_code,
    'country', p.country,
    'status', p.status,
    'created_at', p.created_at,
    'activated_at', p.activated_at,
    'suspended_at', p.suspended_at,
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'first_name', m.first_name,
        'last_name', m.last_name,
        'email', m.email,
        'mobile', m.mobile,
        'is_representative', m.id = p.representative_id,
        'status', case
          when m.suspended_at is not null then 'suspended'
          when m.user_id is null then 'on_activation'
          when u.email_confirmed_at is null then 'invited'
          else 'active'
        end
      ) order by m.id = p.representative_id desc, m.created_at, m.email)
      from public.partner_members m
      left join auth.users u on u.id = m.user_id
      where m.partner_id = p.id
    ), '[]'::jsonb),
    'lounges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'area', l.neighborhood || ', ' || l.city,
        'content_status', l.content_status,
        'suspended_by', l.suspended_by,
        'capacity', l.capacity
      ) order by l.name)
      from public.lounges l
      where l.partner_id = p.id and l.content_status <> 'archived'
    ), '[]'::jsonb)
  )
  into v_result
  from public.partners p
  where p.id = p_partner_id;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_partner_list()
  RETURNS TABLE (
    id                   uuid,
    name                 text,
    contact_email        text,
    status               text,
    lounge_count         integer,
    representative_name  text,
    representative_email text,
    city                 text,
    created_at           timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  return query
    select
      p.id,
      p.name,
      p.contact_email,
      p.status,
      (select count(*)::int from public.lounges l where l.partner_id = p.id and l.content_status <> 'archived'),
      case when r.id is not null then trim(r.first_name || ' ' || r.last_name) end,
      r.email,
      p.city,
      p.created_at
    from public.partners p
    left join public.partner_members r on r.id = p.representative_id
    order by p.created_at desc, p.name;
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

CREATE OR REPLACE FUNCTION public.admin_reactivate_lounge (
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

  select * into v_lounge from public.lounges where id = p_lounge_id and content_status = 'suspended' for update;
  if v_lounge.id is null then
    raise exception 'Only a suspended lounge can be reactivated';
  end if;
  if v_lounge.suspended_by = 'partner' then
    raise exception 'This lounge was suspended with its partner — reactivate the partner instead';
  end if;

  update public.lounges set content_status = 'draft', suspended_by = null, updated_at = now() where id = p_lounge_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reactivate_partner (
  p_partner_id uuid
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

  update public.partners set status = 'active', suspended_at = null, updated_at = now()
  where id = p_partner_id and status = 'suspended';
  if not found then
    raise exception 'Only a suspended partner can be reactivated';
  end if;

  update public.lounges set content_status = 'draft', suspended_by = null, updated_at = now()
  where partner_id = p_partner_id and content_status = 'suspended' and suspended_by = 'partner';
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_partner_representative (
  p_partner_id uuid,
  p_member_id  uuid
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
  update public.partners set representative_id = p_member_id, updated_at = now() where id = p_partner_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_suspend_lounge (
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

  update public.lounges set content_status = 'suspended', suspended_by = 'admin', updated_at = now()
  where id = p_lounge_id and content_status = 'live';
  if not found then
    raise exception 'Only a live lounge can be suspended';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_suspend_partner (
  p_partner_id uuid
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

  update public.partners set status = 'suspended', suspended_at = now(), updated_at = now()
  where id = p_partner_id and status = 'active';
  if not found then
    raise exception 'Only an active partner can be suspended';
  end if;

  update public.lounges set content_status = 'suspended', suspended_by = 'partner', updated_at = now()
  where partner_id = p_partner_id and content_status = 'live';
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

CREATE OR REPLACE FUNCTION public.admin_update_partner (
  p_partner_id uuid,
  p_partner    jsonb
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
  perform public.admin_apply_partner_details(p_partner_id, p_partner);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_partner_member (
  p_member_id uuid,
  p_member    jsonb
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
  if coalesce(trim(p_member->>'first_name'), '') = '' or coalesce(trim(p_member->>'last_name'), '') = '' then
    raise exception 'A partner user needs a first name and last name';
  end if;

  update public.partner_members m set
    first_name = trim(p_member->>'first_name'),
    last_name = trim(p_member->>'last_name'),
    mobile = coalesce(trim(p_member->>'mobile'), '')
  where m.id = p_member_id;
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
