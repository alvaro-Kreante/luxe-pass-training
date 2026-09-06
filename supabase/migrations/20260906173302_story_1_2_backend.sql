SET local check_function_bodies = off;

CREATE TABLE "public"."login_attempts" (
  "email"        text                     NOT NULL,
  "failed_count" integer                  NOT NULL DEFAULT 0,
  "locked_until" timestamp with time zone,
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY (email)
);

ALTER TABLE "public"."login_attempts"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_login_lock (
  p_email text
)
  RETURNS TABLE (
    locked       boolean,
    locked_until timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_locked_until timestamptz;
begin
  select la.locked_until into v_locked_until
  from public.login_attempts la
  where la.email = lower(trim(p_email));

  return query select (v_locked_until is not null and v_locked_until > now()), v_locked_until;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_failed_login (
  p_email text
)
  RETURNS TABLE (
    failed_count integer,
    locked       boolean,
    locked_until timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_email text := lower(trim(p_email));
  v_failed_count int;
  v_locked_until timestamptz;
begin
  insert into public.login_attempts as la (email, failed_count, updated_at)
  values (v_email, 1, now())
  on conflict (email) do update
    set failed_count = case
          when la.locked_until is not null and la.locked_until > now()
            then la.failed_count
          else la.failed_count + 1
        end,
        updated_at = now()
  returning la.failed_count into v_failed_count;

  if v_failed_count >= 5 then
    update public.login_attempts la
      set locked_until = coalesce(la.locked_until, now() + interval '15 minutes')
      where la.email = v_email
      returning la.locked_until into v_locked_until;
  end if;

  return query select v_failed_count, (v_locked_until is not null and v_locked_until > now()), v_locked_until;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reset_login_attempts (
  p_email text
)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  delete from public.login_attempts where email = lower(trim(p_email));
$function$;

GRANT EXECUTE ON FUNCTION "public"."check_login_lock"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."record_failed_login"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reset_login_attempts"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."login_attempts" TO "anon", "authenticated", "postgres", "service_role";
