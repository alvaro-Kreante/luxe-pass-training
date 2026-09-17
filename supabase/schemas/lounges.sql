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
  -- Story 3.1 — agregado de reseñas; ninguna historia permite dejar una
  -- reseña todavía, así que no hay tabla `reviews` (ver DATA-MODEL-MAP.md).
  review_count         integer not null default 0,
  -- Story 3.2 — capacidad y restricciones estáticas por lounge.
  capacity             integer not null default 40,
  booking_restrictions text[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.lounges enable row level security;

-- Catálogo de solo lectura para miembros con sesión; /explore pasa a exigir
-- login real (RequireSession, mismo patrón que /onboarding — ver
-- docs/design/COMPONENT-MAP.md "Backend real — Epic 2"). Sin policies de
-- escritura: el catálogo se siembra por migración hasta que Epic 8.3 diseñe
-- su admin.
create policy "select lounges"
on public.lounges for select
to authenticated
using ( true );
