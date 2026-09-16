-- Story 2.1 — nace aquí (ver docs/DATA-MODEL-MAP.md). Epic 3 la extenderá con
-- hero images, contacto y rating agregado; hasta entonces open_now/slots_today/
-- bands/closed_weekdays/rating son una instantánea sembrada del mock, no el
-- modelo final (ver docs/design/COMPONENT-MAP.md "Backend real — Epic 2").
create table if not exists public.lounges (
  id              text primary key,
  name            text not null,
  neighborhood    text not null,
  city            text not null,
  city_id         text not null,
  lat             double precision not null,
  lng             double precision not null,
  amenities       text[] not null default '{}',
  rating          numeric(2, 1) not null default 0,
  open_now        boolean not null default true,
  slots_today     integer not null default 0,
  hours           text not null,
  bands           text[] not null default '{}',
  closed_weekdays smallint[] not null default '{}',
  featured        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
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
