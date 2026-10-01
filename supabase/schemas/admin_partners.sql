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
