-- Epic 8 — Admin & Support. Story 8.3 (Content Management). El CRUD real
-- vive sobre `lounges`/`lounge_images` (Epic 2/3, ver
-- docs/DATA-MODEL-MAP.md) — esta tabla es la única que nace en esta
-- historia: la cola de cambios pendientes de aprobación.
--
-- "Content approval workflow": un cambio nunca toca `lounges` directamente
-- — se guarda como propuesta (`proposed`, jsonb) y solo se aplica al
-- aprobarla. Mientras está pendiente, el lounge sigue mostrando su
-- contenido publicado tal cual a los miembros (ver el comentario de
-- `content_status` en `lounges.sql`) — el chip "N to approve" de
-- `/admin/lounges` sale de esta tabla, no de `lounges.content_status`.
create table if not exists public.lounge_content_submissions (
  id              uuid primary key default gen_random_uuid(),
  lounge_id       text not null references public.lounges (id) on delete cascade,
  submitted_by    uuid references auth.users (id),
  proposed        jsonb not null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolution_note text not null default '',
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table public.lounge_content_submissions enable row level security;

create policy "admin manages lounge content submissions"
on public.lounge_content_submissions for all
to authenticated
using ( public.has_role('admin') )
with check ( public.has_role('admin') );

/* -------------------------------------------------------------------- */
/* "Add/edit/remove lounge profiles" (la lista)                         */
/* -------------------------------------------------------------------- */

create or replace function public.admin_lounge_list()
returns table (
  id text,
  name text,
  area text,
  capacity int,
  content_status text,
  pending_count int,
  photos_count int,
  amenities_count int,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_lounge_list() to authenticated;

/* -------------------------------------------------------------------- */
/* Ficha de contenido de un lounge (LoungeEdit.dc.html)                  */
/* -------------------------------------------------------------------- */

create or replace function public.admin_lounge_detail(p_lounge_id text)
returns table (
  id text,
  name text,
  area text,
  capacity int,
  content_status text,
  amenities text[],
  bands text[],
  closed_weekdays smallint[],
  weekly_hours jsonb,
  booking_restrictions text[],
  images jsonb,
  closures jsonb,
  pending_submission_id uuid,
  pending_proposed jsonb,
  pending_submitted_by text,
  pending_submitted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_lounge_detail(text) to authenticated;

/* -------------------------------------------------------------------- */
/* "Content approval workflow"                                          */
/* -------------------------------------------------------------------- */

-- `p_proposed` es un objeto con cualquiera de estas claves, todas opcionales
-- — solo las presentes se aplican al aprobar (ver `admin_approve_lounge_submission`):
--   amenities (text[]), bands (text[]), closed_weekdays (int[]),
--   weekly_hours (7 strings, domingo primero), booking_restrictions (text[]),
--   capacity (int), photos (array de {url, caption, position}),
--   publish (boolean — true publica un lounge 'draft' al aprobar).
create or replace function public.admin_submit_lounge_content_change(p_lounge_id text, p_proposed jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_submit_lounge_content_change(text, jsonb) to authenticated;

create or replace function public.admin_approve_lounge_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_approve_lounge_submission(uuid) to authenticated;

create or replace function public.admin_reject_lounge_submission(p_submission_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_reject_lounge_submission(uuid, text) to authenticated;

/* -------------------------------------------------------------------- */
/* "Bulk update capabilities" — el único botón real de la barra masiva:  */
/* archivar retira el lounge del catálogo de miembro de inmediato, sin    */
/* pasar por revisión (no es contenido nuevo que aprobar, es su retiro). */
/* -------------------------------------------------------------------- */

create or replace function public.admin_archive_lounges(p_lounge_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;

  update public.lounges set content_status = 'archived', updated_at = now()
  where id = any(p_lounge_ids);
end;
$$;

grant execute on function public.admin_archive_lounges(text[]) to authenticated;

/* -------------------------------------------------------------------- */
/* "Upload and manage lounge images" — bucket declarado en config.toml   */
/* -------------------------------------------------------------------- */

-- Público para lectura (cualquiera puede ver la foto de un lounge, como en
-- /explore); solo un admin puede subir/editar/borrar. A diferencia de
-- profile-photos (una carpeta por usuario), aquí no hace falta esa
-- partición — el nombre de objeto es libre, la autorización es por rol.
create policy "select lounge images bucket"
on storage.objects for select
to public
using ( bucket_id = 'lounge-images' );

create policy "admin manages lounge images bucket"
on storage.objects for all
to authenticated
using ( bucket_id = 'lounge-images' and public.has_role('admin') )
with check ( bucket_id = 'lounge-images' and public.has_role('admin') );
