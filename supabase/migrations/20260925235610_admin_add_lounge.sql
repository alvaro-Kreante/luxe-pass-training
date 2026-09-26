SET local check_function_bodies = off;

DROP FUNCTION "public"."admin_lounge_detail"(text);

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
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_lounge_submission (
  p_submission_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_submission public.lounge_content_submissions;
  v_photo jsonb;
  v_position smallint := 0;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  select * into v_submission from public.lounge_content_submissions where id = p_submission_id and status = 'pending';
  if v_submission.id is null then
    raise exception 'Submission not found or already resolved';
  end if;

  update public.lounges l set
    amenities = case when v_submission.proposed ? 'amenities'
      then (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(v_submission.proposed->'amenities') x)
      else l.amenities end,
    bands = case when v_submission.proposed ? 'bands'
      then (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(v_submission.proposed->'bands') x)
      else l.bands end,
    closed_weekdays = case when v_submission.proposed ? 'closed_weekdays'
      then (select coalesce(array_agg(x::smallint), '{}') from jsonb_array_elements_text(v_submission.proposed->'closed_weekdays') x)
      else l.closed_weekdays end,
    weekly_hours = coalesce(v_submission.proposed->'weekly_hours', l.weekly_hours),
    booking_restrictions = case when v_submission.proposed ? 'booking_restrictions'
      then (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(v_submission.proposed->'booking_restrictions') x)
      else l.booking_restrictions end,
    capacity = coalesce((v_submission.proposed->>'capacity')::int, l.capacity),
    content_status = case when (v_submission.proposed->>'publish')::boolean is true then 'live' else l.content_status end,
    updated_at = now()
    where l.id = v_submission.lounge_id;

  if v_submission.proposed ? 'photos' then
    delete from public.lounge_images where lounge_id = v_submission.lounge_id;
    for v_photo in select * from jsonb_array_elements(v_submission.proposed->'photos') loop
      insert into public.lounge_images (lounge_id, url, caption, position)
      values (v_submission.lounge_id, v_photo->>'url', coalesce(v_photo->>'caption', ''), v_position);
      v_position := v_position + 1;
    end loop;
  end if;

  update public.lounge_content_submissions
    set status = 'approved', resolved_at = now()
    where id = p_submission_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_archive_lounges (
  p_lounge_ids text[]
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

  update public.lounges set content_status = 'archived', updated_at = now()
  where id = any(p_lounge_ids);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_lounge (
  p_lounge jsonb
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_base text := coalesce(nullif(p_lounge->>'id_base', ''), 'lounge');
  v_id text := v_base;
  v_suffix int := 1;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  while exists (select 1 from public.lounges where id = v_id) loop
    v_suffix := v_suffix + 1;
    v_id := v_base || '-' || v_suffix;
  end loop;

  -- Las tres franjas abiertas: la disponibilidad en vivo
  -- (`lounge_availability.sql`) las ofrece con `capacity` plazas cada una.
  insert into public.lounges (id, name, neighborhood, city, city_id, lat, lng, hours, bands, content_status)
  values (v_id, '', '', '', '', 0, 0, '', array['morning', 'afternoon', 'evening'], 'draft');

  perform public.admin_apply_lounge_draft(v_id, p_lounge);

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_lounge_detail (
  p_lounge_id text
)
  RETURNS TABLE (
    id                    text,
    name                  text,
    area                  text,
    capacity              integer,
    content_status        text,
    amenities             text[],
    bands                 text[],
    closed_weekdays       smallint[],
    weekly_hours          jsonb,
    booking_restrictions  text[],
    images                jsonb,
    closures              jsonb,
    phone                 text,
    email                 text,
    website               text,
    address               text,
    neighborhood          text,
    city                  text,
    lat                   double precision,
    lng                   double precision,
    pending_submission_id uuid,
    pending_proposed      jsonb,
    pending_submitted_by  text,
    pending_submitted_at  timestamp with time zone
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
      l.id, l.name, l.neighborhood || ', ' || l.city, l.capacity, l.content_status,
      l.amenities, l.bands, l.closed_weekdays, l.weekly_hours, l.booking_restrictions,
      coalesce(
        (select jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'caption', i.caption, 'detail', i.detail, 'position', i.position) order by i.position)
         from public.lounge_images i where i.lounge_id = l.id),
        '[]'::jsonb
      ),
      coalesce(
        (select jsonb_agg(jsonb_build_object('id', c.id, 'starts_on', c.starts_on, 'ends_on', c.ends_on, 'reason', c.reason, 'reopens_label', c.reopens_label) order by c.starts_on)
         from public.lounge_closures c where c.lounge_id = l.id),
        '[]'::jsonb
      ),
      l.phone, l.email, l.website, l.address, l.neighborhood, l.city, l.lat, l.lng,
      s.id,
      s.proposed,
      case when a.email is not null then split_part(a.email::text, '@', 1) end,
      s.created_at
    from public.lounges l
    left join public.lounge_content_submissions s on s.lounge_id = l.id and s.status = 'pending'
    left join auth.users a on a.id = s.submitted_by
    where l.id = p_lounge_id;
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
    updated_at      timestamp with time zone
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
      l.updated_at
    from public.lounges l
    order by
      (select count(*) from public.lounge_content_submissions s where s.lounge_id = l.id and s.status = 'pending') desc,
      l.name;
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

  update public.lounges set content_status = 'live', updated_at = now() where id = p_lounge_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_lounge_submission (
  p_submission_id uuid,
  p_note          text DEFAULT ''::text
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

  update public.lounge_content_submissions
    set status = 'rejected', resolution_note = coalesce(p_note, ''), resolved_at = now()
    where id = p_submission_id and status = 'pending';

  if not found then
    raise exception 'Submission not found or already resolved';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_draft_lounge_photos (
  p_lounge_id text,
  p_photos    jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_photo jsonb;
  v_position smallint := 0;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  perform 1 from public.lounges where id = p_lounge_id and content_status = 'draft' for update;
  if not found then
    raise exception 'Only drafts can be edited this way';
  end if;

  if jsonb_array_length(coalesce(p_photos, '[]'::jsonb)) > 3 then
    raise exception 'A lounge has up to 3 photos';
  end if;

  delete from public.lounge_images where lounge_id = p_lounge_id;
  for v_photo in select * from jsonb_array_elements(coalesce(p_photos, '[]'::jsonb)) loop
    insert into public.lounge_images (lounge_id, url, caption, detail, position)
    values (p_lounge_id, v_photo->>'url', coalesce(v_photo->>'caption', ''), nullif(v_photo->>'detail', ''), v_position);
    v_position := v_position + 1;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_submit_lounge_content_change (
  p_lounge_id text,
  p_proposed  jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_id uuid;
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  if exists (select 1 from public.lounge_content_submissions where lounge_id = p_lounge_id and status = 'pending') then
    raise exception 'This lounge already has a change waiting for approval';
  end if;

  insert into public.lounge_content_submissions (lounge_id, submitted_by, proposed)
  values (p_lounge_id, auth.uid(), p_proposed)
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_draft_lounge (
  p_lounge_id text,
  p_lounge    jsonb
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

  perform 1 from public.lounges where id = p_lounge_id and content_status = 'draft' for update;
  if not found then
    raise exception 'Only drafts can be edited this way';
  end if;

  perform public.admin_apply_lounge_draft(p_lounge_id, p_lounge);
end;
$function$;

REVOKE ALL ON FUNCTION "public"."admin_apply_lounge_draft"(text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."admin_apply_lounge_draft"(text, jsonb) TO "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_create_lounge"(jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_lounge_detail"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_publish_lounge"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_set_draft_lounge_photos"(text, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_update_draft_lounge"(text, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
