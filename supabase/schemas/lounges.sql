-- Story 2.1 — nace aquí (ver docs/DATA-MODEL-MAP.md). Epic 3 la extiende con
-- contacto, horario estructurado, hero images (tabla propia) y rating
-- agregado (docs/design/COMPONENT-MAP.md "Backend real — Epic 3");
-- open_now/slots_today siguen siendo una instantánea sembrada del mock hasta
-- que Epic 4 aporte disponibilidad real de bookings.
create table if not exists public.lounges (
  id                   text primary key,
  name                 text not null,
  neighborhood         text not null,
  city                 text not null,
  city_id              text not null,
  lat                  double precision not null,
  lng                  double precision not null,
  amenities            text[] not null default '{}',
  rating               numeric(2, 1) not null default 0,
  open_now             boolean not null default true,
  slots_today          integer not null default 0,
  hours                text not null,
  bands                text[] not null default '{}',
  closed_weekdays      smallint[] not null default '{}',
  featured             boolean not null default false,
  -- Story 3.1 — contacto real (Main.dc.html "Contact").
  address              text not null default '',
  phone                text not null default '',
  email                text not null default '',
  website              text not null default '',
  reception_note       text not null default '',
  -- Story 3.1 — horario semanal por lounge (domingo primero), sustituye el
  -- STANDARD_WEEK_HOURS compartido de lib/lounge-profile.ts.
  weekly_hours         jsonb not null default '[]',
  -- Story 3.1 — agregado de reseñas, lo mantiene `refresh_lounge_rating`
  -- (`reviews.sql`) con cada reseña real.
  review_count         integer not null default 0,
  -- Story 3.2 — capacidad y restricciones estáticas por lounge.
  capacity             integer not null default 40,
  booking_restrictions text[] not null default '{}',
  -- Story 8.3 — "Add/edit/remove lounge profiles" + "Content approval
  -- workflow". Estado de publicación real, ortogonal a si hay un cambio de
  -- contenido pendiente de aprobar (eso vive en
  -- `lounge_content_submissions`, ver `supabase/schemas/admin_content.sql`)
  -- — un lounge 'live' con una edición en revisión sigue siendo visible
  -- para los miembros con su contenido ya publicado hasta que se apruebe.
  content_status       text not null default 'live' check (content_status in ('live', 'draft', 'archived', 'suspended')),
  -- Story 10.4 — quién lo suspendió: 'admin' (suelto) o 'partner' (al
  -- suspender su partner). Al reactivar el partner solo vuelven a draft los
  -- suyos; los que el admin suspendió a mano siguen suspendidos.
  suspended_by         text check (suspended_by in ('admin', 'partner')),
  -- Story 10.1 — el partner (organización) que opera el lounge. Null solo
  -- mientras es borrador: publicar exige un partner activo.
  partner_id           uuid references public.partners (id) on delete restrict,
  -- Quién lo dio de alta (admin). Sin cascada: borrar la cuenta no borra el
  -- lounge. Sirve también para que la suite borre lo que crean sus cuentas.
  created_by           uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists lounges_partner_id_idx on public.lounges (partner_id);

alter table public.lounges enable row level security;

-- Catálogo de solo lectura para miembros con sesión; /explore pasa a exigir
-- login real (RequireSession, mismo patrón que /onboarding — ver
-- docs/design/COMPONENT-MAP.md "Backend real — Epic 2"). Story 8.3: un
-- lounge 'draft' o 'archived' queda fuera del catálogo de miembro — el
-- admin (`has_role('admin')`) sigue viendo todo, incluidos esos, para poder
-- gestionarlos desde `/admin/lounges`. Sin policies de insert/update/delete
-- de miembro: el contenido solo se escribe vía las RPC de
-- `admin_content.sql`.
--
-- Epic 8 · LoungeEditConfirm.dc.html (29 sept 2026): editar un lounge live
-- lo devuelve a 'draft', pero sus reservas siguen valiendo — el miembro con
-- reserva sigue viendo su lounge (el pase hace join con `lounges`) y sus
-- partners también (el dashboard lo necesita), aunque salga del catálogo.
create policy "select lounges"
on public.lounges for select
to authenticated
using (
  content_status = 'live'
  or public.has_role('admin')
  or id in (select public.partner_lounge_ids())
  or exists (
    select 1 from public.bookings b
    where b.lounge_id = lounges.id and b.member_id = (select auth.uid())
  )
);
