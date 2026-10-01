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
  updated_at timestamptz,
  city text,
  created_at timestamptz
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
      l.updated_at,
      l.city,
      l.created_at
    from public.lounges l
    order by l.created_at desc, l.name;
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
  phone text,
  email text,
  website text,
  address text,
  neighborhood text,
  city text,
  lat double precision,
  lng double precision,
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
/* "Add/edit/remove lounge profiles" — alta de un lounge nuevo           */
/* (LoungeNew.dc.html / PhotoCaption.dc.html)                            */
/* -------------------------------------------------------------------- */

-- Un lounge nuevo nace 'draft' (invisible para los miembros, ver la policy
-- de `lounges`) y se publica directo con `admin_publish_lounge`, sin pasar
-- por `lounge_content_submissions` — decisión de producto (25 sept 2026):
-- hoy cualquier admin aprueba cualquier cambio, incluido el suyo, así que
-- la cola solo añadiría un clic. Mientras es borrador se edita entero,
-- dirección incluida; una vez publicado la dirección queda fija.
--
-- `p_lounge` lleva: id_base (slug del nombre, ver `loungeIdFromName`),
-- name, phone, email, website, address, neighborhood, city, lat, lng,
-- weekly_hours (7 strings, domingo primero), closed_weekdays (int[]),
-- hours (resumen corto), amenities (text[]), capacity (plazas por franja).

create or replace function public.admin_apply_lounge_draft(p_lounge_id text, p_lounge jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_apply_lounge_draft(text, jsonb) from public, anon, authenticated;

create or replace function public.admin_create_lounge(p_lounge jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_create_lounge(jsonb) to authenticated;

create or replace function public.admin_update_draft_lounge(p_lounge_id text, p_lounge jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_update_draft_lounge(text, jsonb) to authenticated;

-- `p_photos`: array de {url, caption, detail} — el orden es la posición, y
-- la primera (position 0) es la foto principal que abre el perfil. Solo
-- puede haber una: es un orden, no una marca por foto.
create or replace function public.admin_set_draft_lounge_photos(p_lounge_id text, p_photos jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_set_draft_lounge_photos(text, jsonb) to authenticated;

-- Mismos requisitos que la lista "Before it can be published" del
-- artboard (`publishChecklist`, src/lib/lounge-draft.ts) — el servidor los
-- vuelve a comprobar, el cliente solo los muestra.
create or replace function public.admin_publish_lounge(p_lounge_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_publish_lounge(text) to authenticated;

-- Epic 8 · LoungeEditConfirm.dc.html — "Move to draft and edit". El lounge
-- sale del catálogo de miembro hasta que se vuelva a publicar; sus reservas
-- siguen valiendo (ver la policy de `lounges`).
create or replace function public.admin_unpublish_lounge(p_lounge_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_unpublish_lounge(text) to authenticated;

-- Epic 8 · LoungeLive.dc.html / LoungeDraftPartners.dc.html — la lista de
-- partners de un lounge con su estado: 'on_publish' (escrito en el borrador,
-- aún sin cuenta), 'invited' (cuenta creada, sin contraseña todavía),
-- 'active' o 'suspended'. El estado de la invitación sale de `auth.users`,
-- por eso es security definer (solo admin).
create or replace function public.admin_lounge_partners(p_lounge_id text)
returns table (
  user_id    uuid,
  first_name text,
  last_name  text,
  email      text,
  mobile     text,
  status     text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.admin_lounge_partners(text) to authenticated;

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
