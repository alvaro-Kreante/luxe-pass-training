-- Story 3.1 — "User ratings and review count (if available)". Nace aquí,
-- dueña Epic 3 (ver docs/DATA-MODEL-MAP.md). Una reseña por visita, no por
-- lounge: un miembro que vuelve al mismo lounge puede reseñar cada visita.
-- Solo reseña quien hizo check-in (decisión del usuario, 23 oct 2026).
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  lounge_id  text not null references public.lounges (id) on delete cascade,
  member_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text not null default '' check (char_length(body) <= 1000),
  mentions   text[] not null default '{}' check (cardinality(mentions) <= 5),
  created_at timestamptz not null default now()
);

create index if not exists reviews_lounge_id_idx on public.reviews (lounge_id);
create index if not exists reviews_member_id_idx on public.reviews (member_id);

alter table public.reviews enable row level security;

-- El miembro lee las suyas (para saber qué visitas le quedan por reseñar);
-- las de los demás se leen por `lounge_reviews`, que solo expone el nombre
-- abreviado.
create policy "select own reviews"
on public.reviews for select
to authenticated
using ( (select auth.uid()) = member_id );

create policy "insert review of own checked-in visit"
on public.reviews for insert
to authenticated
with check (
  (select auth.uid()) = member_id
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and b.member_id = (select auth.uid())
      and b.lounge_id = reviews.lounge_id
      and b.checked_in_at is not null
  )
);

grant select, insert on public.reviews to authenticated;

-- El lounge sale de la reserva: el cliente solo manda `booking_id`.
create or replace function public.set_review_lounge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.lounge_id := (select b.lounge_id from public.bookings b where b.id = new.booking_id);
  return new;
end;
$$;

create or replace trigger reviews_set_lounge
before insert on public.reviews
for each row execute function public.set_review_lounge();

-- `lounges.rating`/`review_count` dejan de ser cifras sembradas: los
-- recalcula cada reseña. `security definer` porque el miembro no puede
-- escribir en `lounges`.
create or replace function public.refresh_lounge_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lounge_id text := coalesce(new.lounge_id, old.lounge_id);
begin
  update public.lounges l
  set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.lounge_id = v_lounge_id), 0),
      review_count = (select count(*) from public.reviews r where r.lounge_id = v_lounge_id)
  where l.id = v_lounge_id;
  return null;
end;
$$;

revoke execute on function public.refresh_lounge_rating() from public, anon, authenticated;

create or replace trigger reviews_refresh_lounge_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_lounge_rating();

-- Las reseñas de un lounge publicado (o del propio partner / admin), de la
-- más reciente a la más antigua por fecha de visita. Del autor solo sale
-- "Nombre I." y su plan, nunca el email ni el id.
create or replace function public.lounge_reviews(p_lounge_id text)
returns table (
  id uuid,
  author_name text,
  plan text,
  visited_on date,
  rating smallint,
  body text,
  mentions text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.lounges l
    where l.id = p_lounge_id
      and (l.content_status = 'live' or public.has_role('admin') or l.id in (select public.partner_lounge_ids()))
  ) then
    return;
  end if;

  return query
    select
      r.id,
      trim(
        split_part(coalesce(nullif(trim(p.full_name), ''), 'Member'), ' ', 1)
        || coalesce(' ' || nullif(left(split_part(trim(p.full_name), ' ', 2), 1), '') || '.', '')
      ),
      m.plan,
      b.date,
      r.rating,
      r.body,
      r.mentions
    from public.reviews r
    join public.bookings b on b.id = r.booking_id
    left join public.profiles p on p.id = r.member_id
    left join public.memberships m on m.member_id = r.member_id and m.status = 'active'
    where r.lounge_id = p_lounge_id
    order by b.date desc, r.created_at desc;
end;
$$;

revoke execute on function public.lounge_reviews(text) from public, anon;
grant execute on function public.lounge_reviews(text) to authenticated;
