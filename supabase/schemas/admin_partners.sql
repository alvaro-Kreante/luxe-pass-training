-- Epic 10 — gestión de partners desde el admin. Las RPC son security
-- definer (como las de `admin_content.sql`): `partners` solo deja leer
-- id/name/status a `authenticated` (privilegio por columna, ver
-- `partners.sql`), y el admin necesita también contacto y usuarios. Cada
-- una comprueba `has_role('admin')` antes de nada.

/* -------------------------------------------------------------------- */
/* Story 10.2 — el listado (Partners.dc.html, Fase 10 · 1)               */
/* -------------------------------------------------------------------- */

create or replace function public.admin_partner_list()
returns table (
  id                   uuid,
  name                 text,
  contact_email        text,
  status               text,
  lounge_count         int,
  representative_name  text,
  representative_email text,
  city                 text,
  created_at           timestamptz
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
$$;

revoke execute on function public.admin_partner_list() from public, anon;
grant execute on function public.admin_partner_list() to authenticated;

/* -------------------------------------------------------------------- */
/* Story 10.3 — crear y editar un partner (PartnerNew / PartnerDetail)   */
/* -------------------------------------------------------------------- */

-- Estado de cada usuario: 'on_activation' sin cuenta todavía (partner en
-- draft), 'invited' con cuenta sin contraseña, 'active' o 'suspended'. El
-- representante va primero; los demás por orden de alta (los que nacen en
-- la misma transacción comparten `created_at`, de ahí el email detrás).
create or replace function public.admin_partner_detail(p_partner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
        'address', coalesce(l.address, ''),
        'city', coalesce(l.city, ''),
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
$$;

revoke execute on function public.admin_partner_detail(uuid) from public, anon;
grant execute on function public.admin_partner_detail(uuid) to authenticated;

-- `p_partner`: name, contact_email, address_line1, address_line2, city,
-- region, postal_code, country. Solo campos de texto, sin Google Maps.
create or replace function public.admin_apply_partner_details(p_partner_id uuid, p_partner jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_apply_partner_details(uuid, jsonb) from public, anon, authenticated;

-- `p_partner.users` (opcional): [{first_name, last_name, email, mobile}] —
-- PartnerNew.dc.html guarda el partner y su primer usuario a la vez. Todo
-- en la misma transacción: un email en uso no deja un partner a medias.
create or replace function public.admin_create_partner(p_partner jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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

  insert into public.partners (name, status, created_by)
  values (trim(p_partner->>'name'), 'draft', auth.uid())
  returning id into v_id;
  perform public.admin_apply_partner_details(v_id, p_partner);
  for v_user in select * from jsonb_array_elements(coalesce(p_partner->'users', '[]'::jsonb)) loop
    perform public.admin_add_partner_member(v_id, v_user);
  end loop;
  return v_id;
end;
$$;

revoke execute on function public.admin_create_partner(jsonb) from public, anon;
grant execute on function public.admin_create_partner(jsonb) to authenticated;

create or replace function public.admin_update_partner(p_partner_id uuid, p_partner jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  perform public.admin_apply_partner_details(p_partner_id, p_partner);
end;
$$;

revoke execute on function public.admin_update_partner(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_partner(uuid, jsonb) to authenticated;

-- `p_member`: first_name, last_name, email, mobile. Sin cuenta todavía: la
-- cuenta nace al activar el partner (Story 10.4). El trigger
-- `partner_members_require_new_email` rechaza un email que ya tiene cuenta.
create or replace function public.admin_add_partner_member(p_partner_id uuid, p_member jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_add_partner_member(uuid, jsonb) from public, anon;
grant execute on function public.admin_add_partner_member(uuid, jsonb) to authenticated;

-- PartnerUserEdit.dc.html — el lápiz: nombre, apellido y móvil. El email es
-- el inicio de sesión y no cambia.
create or replace function public.admin_update_partner_member(p_member_id uuid, p_member jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_update_partner_member(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_partner_member(uuid, jsonb) to authenticated;

create or replace function public.admin_set_partner_representative(p_partner_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  update public.partners set representative_id = p_member_id, updated_at = now() where id = p_partner_id;
end;
$$;

revoke execute on function public.admin_set_partner_representative(uuid, uuid) from public, anon;
grant execute on function public.admin_set_partner_representative(uuid, uuid) to authenticated;

-- Solo usuarios sin cuenta (partner en draft). A uno con cuenta lo borra la
-- Edge Function `admin-partners`, que borra también su usuario de Auth.
create or replace function public.admin_delete_partner_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Not authorized';
  end if;
  if exists (select 1 from public.partner_members m where m.id = p_member_id and m.user_id is not null) then
    raise exception 'This user already has an account';
  end if;
  delete from public.partner_members where id = p_member_id;
end;
$$;

revoke execute on function public.admin_delete_partner_member(uuid) from public, anon;
grant execute on function public.admin_delete_partner_member(uuid) to authenticated;

/* -------------------------------------------------------------------- */
/* Story 10.4 — suspender y reactivar (PartnerSuspend 7, PartnerSuspended */
/* 8, LoungeSuspend 11). Bloquear a los usuarios en Auth lo hace la Edge  */
/* Function `admin-partners`; aquí, el estado de partner y lounges.       */
/* -------------------------------------------------------------------- */

-- Sus lounges publicados pasan a suspendidos "por el partner"; los
-- borradores y los que el admin ya suspendió no cambian.
create or replace function public.admin_suspend_partner(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_suspend_partner(uuid) from public, anon;
grant execute on function public.admin_suspend_partner(uuid) to authenticated;

-- Lo que su suspensión dejó suspendido vuelve a draft, para revisarlo y
-- publicarlo de nuevo; lo que el admin suspendió a mano sigue suspendido.
create or replace function public.admin_reactivate_partner(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_reactivate_partner(uuid) from public, anon;
grant execute on function public.admin_reactivate_partner(uuid) to authenticated;

-- LoungeSuspend.dc.html (11) — sale del catálogo y no acepta reservas
-- nuevas; las hechas se mantienen y su partner lo sigue viendo.
create or replace function public.admin_suspend_lounge(p_lounge_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.admin_suspend_lounge(text) from public, anon;
grant execute on function public.admin_suspend_lounge(text) to authenticated;

-- Vuelve a draft, no a live: se revisa y se publica de nuevo.
create or replace function public.admin_reactivate_lounge(p_lounge_id text)
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

  select * into v_lounge from public.lounges where id = p_lounge_id and content_status = 'suspended' for update;
  if v_lounge.id is null then
    raise exception 'Only a suspended lounge can be reactivated';
  end if;
  if v_lounge.suspended_by = 'partner' then
    raise exception 'This lounge was suspended with its partner — reactivate the partner instead';
  end if;

  update public.lounges set content_status = 'draft', suspended_by = null, updated_at = now() where id = p_lounge_id;
end;
$$;

revoke execute on function public.admin_reactivate_lounge(text) from public, anon;
grant execute on function public.admin_reactivate_lounge(text) to authenticated;
