-- Story 2.1 — seed del catálogo real de lounges. Copiado literal de
-- src/lib/lounges.ts (que sigue siendo el mock de Epic 3-9 y ahora además la
-- fuente de este seed), con lat/lng aproximados por barrio real. Migración
-- escrita a mano (no autogenerada): supabase/schemas solo modela DDL.
insert into public.lounges
  (id, name, neighborhood, city, city_id, lat, lng, amenities, rating, open_now, slots_today, hours, bands, closed_weekdays, featured)
values
  ('the-ainsworth', 'The Ainsworth', 'Midtown East', 'New York', 'new-york', 40.7580, -73.9680, '{wifi,co-working,lounge,luggage-storage}', 4.9, true, 8, 'Open until 11 PM', '{morning,afternoon,evening}', '{0}', true),
  ('belmont-terrace', 'Belmont Terrace', 'Bryant Park', 'New York', 'new-york', 40.7536, -73.9832, '{wifi,co-working,luggage-storage}', 4.8, true, 6, 'Open until 10 PM', '{morning,afternoon,evening}', '{0}', true),
  ('aurelia-house', 'Aurelia House', 'NoMad', 'New York', 'new-york', 40.7440, -73.9890, '{wifi,co-working,spa,day-rooms}', 4.7, false, 3, 'Opens 8 AM', '{morning,afternoon}', '{0}', false),
  ('the-winslow-club', 'The Winslow Club', 'Flatiron', 'New York', 'new-york', 40.7410, -73.9896, '{wifi,co-working,day-rooms}', 4.6, true, 5, 'Open until 9 PM', '{morning,afternoon,evening}', '{0}', false),
  ('celeste-rooftop', 'Céleste Rooftop', 'Chelsea', 'New York', 'new-york', 40.7465, -74.0014, '{wifi,lounge,spa}', 4.8, true, 0, 'Open until 1 AM', '{afternoon,evening}', '{}', false),
  ('halcyon-reading-room', 'Halcyon Reading Room', 'Gramercy', 'New York', 'new-york', 40.7369, -73.9840, '{wifi,lounge}', 4.5, true, 7, 'Open until 8 PM', '{morning,afternoon}', '{1}', false),
  ('the-meridian-salon', 'The Meridian Salon', 'SoHo', 'New York', 'new-york', 40.7233, -74.0030, '{wifi,lounge,spa,luggage-storage}', 4.6, true, 4, 'Open until 10 PM', '{afternoon,evening}', '{}', false),
  ('rue-lafayette-club', 'Rue Lafayette Club', 'West Village', 'New York', 'new-york', 40.7358, -74.0036, '{wifi,co-working,lounge}', 4.7, true, 9, 'Open until 11 PM', '{morning,afternoon,evening}', '{}', false),
  ('the-cordelia', 'The Cordelia', 'Upper East Side', 'New York', 'new-york', 40.7736, -73.9566, '{wifi,spa,day-rooms,luggage-storage}', 4.9, true, 2, 'Open until 9 PM', '{morning,evening}', '{2}', false),
  ('sable-and-stone', 'Sable & Stone', 'Tribeca', 'New York', 'new-york', 40.7163, -74.0086, '{wifi,co-working,luggage-storage}', 4.4, false, 6, 'Opens 9 AM', '{morning,afternoon}', '{}', false),
  ('the-ellery-room', 'The Ellery Room', 'Murray Hill', 'New York', 'new-york', 40.7479, -73.9784, '{wifi,lounge,day-rooms}', 4.5, true, 0, 'Open until 10 PM', '{afternoon,evening}', '{1}', false),
  ('verandah-no-9', 'Verandah No. 9', 'Hudson Yards', 'New York', 'new-york', 40.7539, -74.0021, '{wifi,co-working,spa,lounge}', 4.6, true, 5, 'Open until 11 PM', '{morning,afternoon,evening}', '{}', false),
  ('the-ironbound-salon', 'The Ironbound Salon', 'Ironbound', 'Newark', 'newark', 40.7228, -74.1599, '{wifi,lounge}', 4.3, true, 6, 'Open until 9 PM', '{morning,afternoon,evening}', '{}', false),
  ('passaic-house', 'Passaic House', 'Downtown', 'Newark', 'newark', 40.7357, -74.1724, '{wifi,co-working,luggage-storage}', 4.2, true, 4, 'Open until 8 PM', '{morning,afternoon}', '{0}', false),
  ('aurora-gate-lounge', 'Aurora Gate Lounge', 'Terminal B', 'Newark', 'newark', 40.6905, -74.1745, '{wifi,lounge,spa,day-rooms,luggage-storage}', 4.5, true, 11, 'Open until 1 AM', '{morning,afternoon,evening}', '{}', false),
  ('the-pelham-room', 'The Pelham Room', 'Downtown', 'New Rochelle', 'new-rochelle', 40.9115, -73.7824, '{wifi,lounge,day-rooms}', 4.4, false, 5, 'Opens 10 AM', '{morning,afternoon}', '{0,1}', false),
  ('marbella-sky-lounge', 'Marbella Sky Lounge', 'Brickell', 'Miami', 'miami', 25.7617, -80.1918, '{wifi,lounge,spa,day-rooms}', 4.7, true, 7, 'Open until 12 AM', '{afternoon,evening}', '{}', true)
on conflict (id) do nothing;
