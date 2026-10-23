-- Story 3.1 — datos, no schema (el diff declarativo no hace backfill).
-- `lounges.rating`/`review_count` eran cifras sembradas del mockup
-- (`20260917161600_seed_lounge_profiles_story_3.sql`); desde
-- `member_reviews` salen solo de reseñas reales. Decisión del usuario
-- (23 oct 2026): sin reseñas, cada lounge empieza en 0.
update public.lounges l
set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.lounge_id = l.id), 0),
    review_count = (select count(*) from public.reviews r where r.lounge_id = l.id);
