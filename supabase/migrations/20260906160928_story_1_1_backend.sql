SET local check_function_bodies = off;

CREATE TABLE "public"."profiles" (
  "id"                uuid                     NOT NULL,
  "full_name"         text                     NOT NULL,
  "phone"             text                     NOT NULL,
  "photo_url"         text,
  "birth_day"         smallint,
  "birth_month"       smallint,
  "interests"         text[]                   NOT NULL DEFAULT '{}'::text[],
  "city"              text                     NOT NULL,
  "travel_cities"     text[]                   NOT NULL DEFAULT '{}'::text[],
  "job_title"         text,
  "industry"          text                     NOT NULL,
  "company"           text,
  "terms_accepted_at" timestamp with time zone NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_birth_day_check" CHECK (((birth_day >= 1) AND (birth_day <= 31))),
  CONSTRAINT "profiles_birth_month_check" CHECK (((birth_month >= 1) AND (birth_month <= 12))),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.email_exists (
  p_email text
)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from auth.users where lower(email) = lower(p_email)
  );
$function$;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "insert own profile" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "select own profile" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "insert own profile photo" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profile-photos'::text) AND (( SELECT auth.uid() AS uid) = ((storage.foldername(name))[1])::uuid)));

CREATE POLICY "select own profile photo" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'profile-photos'::text) AND (( SELECT auth.uid() AS uid) = ((storage.foldername(name))[1])::uuid)));

CREATE POLICY "update own profile photo" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profile-photos'::text) AND (( SELECT auth.uid() AS uid) = ((storage.foldername(name))[1])::uuid)))
  WITH CHECK (((bucket_id = 'profile-photos'::text) AND (( SELECT auth.uid() AS uid) = ((storage.foldername(name))[1])::uuid)));

GRANT EXECUTE ON FUNCTION "public"."email_exists"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";
