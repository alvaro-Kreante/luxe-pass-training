SET local check_function_bodies = off;

DROP FUNCTION "public"."admin_lounge_list"();

CREATE OR REPLACE FUNCTION public.admin_apply_lounge_draft (
  p_lounge_id text,
  p_lounge    jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_taken text;
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

  -- `partners`: [{first_name, last_name, email, mobile}] — los pendientes de
  -- invitar. Solo se recuerdan: las cuentas nacen al publicar
  -- (`admin-publish-lounge`). Los ya creados (`partner_id`) no se tocan
  -- aquí — se gestionan desde la lista de partners.
  if jsonb_typeof(p_lounge->'partners') = 'array' then
    -- Un partner gestiona un solo lounge (decisión 1 oct 2026): un email que
    -- ya usa otro lounge — pendiente o con cuenta — o cualquier otra cuenta
    -- de LuxePass (miembro, admin) está en uso. Los de este mismo lounge sí
    -- se pueden volver a guardar.
    select e.email into v_taken
    from (
      select lower(trim(x->>'email')) as email from jsonb_array_elements(p_lounge->'partners') x
    ) e
    where e.email <> ''
      and not exists (
        select 1 from public.lounge_partner_invites own
        where own.lounge_id = p_lounge_id and lower(own.email) = e.email
      )
      and (
        exists (select 1 from public.lounge_partner_invites i where lower(i.email) = e.email)
        or exists (select 1 from auth.users u where lower(u.email) = e.email)
      )
    limit 1;
    if v_taken is not null then
      raise exception '% is already in use', v_taken;
    end if;

    delete from public.lounge_partner_invites i
    where i.lounge_id = p_lounge_id
      and i.partner_id is null
      and lower(i.email) not in (
        select lower(trim(x->>'email')) from jsonb_array_elements(p_lounge->'partners') x
      );

    insert into public.lounge_partner_invites (lounge_id, first_name, last_name, email, mobile, position)
    select
      p_lounge_id,
      coalesce(trim(x->>'first_name'), ''),
      coalesce(trim(x->>'last_name'), ''),
      lower(coalesce(trim(x->>'email'), '')),
      coalesce(trim(x->>'mobile'), ''),
      (ord - 1)::int
    from jsonb_array_elements(p_lounge->'partners') with ordinality as t(x, ord)
    where coalesce(trim(x->>'email'), '') <> ''
    on conflict (lounge_id, email) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      mobile = excluded.mobile,
      position = excluded.position,
      updated_at = now()
    where public.lounge_partner_invites.partner_id is null;
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

CREATE OR REPLACE FUNCTION public.admin_lounge_partners (
  p_lounge_id text
)
  RETURNS TABLE (
    user_id    uuid,
    first_name text,
    last_name  text,
    email      text,
    mobile     text,
    status     text
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
    select * from (
      select
        p.user_id,
        p.first_name,
        p.last_name,
        p.contact_email,
        p.contact_phone,
        case
          when p.suspended_at is not null then 'suspended'
          when u.email_confirmed_at is null then 'invited'
          else 'active'
        end
      from public.partner_lounges pl
      join public.partners p on p.id = pl.partner_id
      join auth.users u on u.id = p.user_id
      left join public.lounge_partner_invites i on i.lounge_id = pl.lounge_id and i.partner_id = p.id
      where pl.lounge_id = p_lounge_id
      order by coalesce(i.position, 0), pl.created_at
    ) linked
    union all
    select * from (
      select null::uuid, i.first_name, i.last_name, i.email, i.mobile, 'on_publish'
      from public.lounge_partner_invites i
      where i.lounge_id = p_lounge_id and i.partner_id is null
      order by i.position, i.created_at
    ) pending;
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

  if not exists (
    select 1 from public.partner_lounges pl
    join public.partners p on p.id = pl.partner_id
    where pl.lounge_id = p_lounge_id and p.suspended_at is null
  ) then
    raise exception 'A lounge needs a partner account before it can be published';
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

GRANT EXECUTE ON FUNCTION "public"."admin_lounge_list"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
