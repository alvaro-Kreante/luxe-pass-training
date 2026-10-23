-- Story 5.1 — datos, no schema (el diff declarativo no hace backfill). Los
-- lounges de Perú van en su huso; el resto del catálogo está en el este de
-- EE. UU. (Nueva York, Newark, New Rochelle, Miami), el default de la columna.
update public.lounges
set timezone = 'America/Lima'
where city_id in ('tacna', 'arequipa', 'lima');
