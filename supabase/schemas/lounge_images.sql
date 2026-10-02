-- Story 3.1 — nace aquí (ver docs/DATA-MODEL-MAP.md). Colección ordenada de
-- fotos por lounge, sustituye el archivo estático
-- src/components/lounges/hero-photos.ts (compartido por todo el catálogo).
-- Epic 8.3 gestionará esta tabla desde el admin — de ahí tabla propia en vez
-- de un array en `lounges`.
create table if not exists public.lounge_images (
  id         uuid primary key default gen_random_uuid(),
  lounge_id  text not null references public.lounges (id) on delete cascade,
  url        text not null,
  caption    text not null,
  detail     text,
  position   smallint not null,
  -- Story 10.10 — la foto que ve el miembro es un recorte; su original y el
  -- encuadre ({x, y, width, height} en píxeles del original, y `size`) se
  -- guardan para reencuadrarla sin perder calidad. Null en las sembradas.
  original_url text,
  crop       jsonb,
  created_at timestamptz not null default now(),
  unique (lounge_id, position)
);

alter table public.lounge_images enable row level security;

-- Mismo criterio de solo lectura que `lounges`: se siembra por migración
-- hasta que Epic 8.3 diseñe su propio flujo de admin.
create policy "select lounge images"
on public.lounge_images for select
to authenticated
using ( true );
