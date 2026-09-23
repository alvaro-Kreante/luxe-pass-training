SET local check_function_bodies = off;

DROP POLICY "select lounges" ON "public"."lounges";

CREATE TABLE "public"."lounge_content_submissions" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lounge_id"       text                     NOT NULL,
  "submitted_by"    uuid,
  "proposed"        jsonb                    NOT NULL,
  "status"          text                     NOT NULL DEFAULT 'pending'::text,
  "resolution_note" text                     NOT NULL DEFAULT ''::text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at"     timestamp with time zone,
  CONSTRAINT "lounge_content_submissions_pkey" PRIMARY KEY (id),
  CONSTRAINT "lounge_content_submissions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE "public"."lounge_content_submissions"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lounges"
  ADD COLUMN "content_status" text NOT NULL DEFAULT 'live'::text;

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
        (select jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'caption', i.caption, 'position', i.position) order by i.position)
         from public.lounge_images i where i.lounge_id = l.id),
        '[]'::jsonb
      ),
      coalesce(
        (select jsonb_agg(jsonb_build_object('id', c.id, 'starts_on', c.starts_on, 'ends_on', c.ends_on, 'reason', c.reason, 'reopens_label', c.reopens_label) order by c.starts_on)
         from public.lounge_closures c where c.lounge_id = l.id),
        '[]'::jsonb
      ),
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

ALTER TABLE "public"."lounge_content_submissions"
  ADD CONSTRAINT "lounge_content_submissions_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

ALTER TABLE "public"."lounge_content_submissions"
  ADD CONSTRAINT "lounge_content_submissions_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);

ALTER TABLE "public"."lounges"
  ADD CONSTRAINT "lounges_content_status_check" CHECK ((content_status = ANY (ARRAY['live'::text, 'draft'::text, 'archived'::text])));

CREATE POLICY "admin manages lounge content submissions" ON "public"."lounge_content_submissions"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('admin'::text))
  WITH CHECK (public.has_role('admin'::text));

CREATE POLICY "select lounges" ON "public"."lounges"
  FOR SELECT
  TO "authenticated"
  USING (((content_status = 'live'::text) OR public.has_role('admin'::text)));

CREATE POLICY "admin manages lounge images bucket" ON "storage"."objects"
  FOR ALL
  TO "authenticated"
  USING (((bucket_id = 'lounge-images'::text) AND public.has_role('admin'::text)))
  WITH CHECK (((bucket_id = 'lounge-images'::text) AND public.has_role('admin'::text)));

CREATE POLICY "select lounge images bucket" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'lounge-images'::text));

GRANT EXECUTE ON FUNCTION "public"."admin_approve_lounge_submission"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_archive_lounges"(text[]) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_lounge_detail"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_lounge_list"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_reject_lounge_submission"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."admin_submit_lounge_content_change"(text, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lounge_content_submissions" TO "anon", "authenticated", "postgres", "service_role";
