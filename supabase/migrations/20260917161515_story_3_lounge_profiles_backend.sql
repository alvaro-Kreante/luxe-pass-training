CREATE TABLE "public"."lounge_availability" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lounge_id"  text                     NOT NULL,
  "date"       date                     NOT NULL,
  "band"       text                     NOT NULL,
  "seats_left" smallint                 NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lounge_availability_band_check" CHECK ((band = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text, 'late'::text]))),
  CONSTRAINT "lounge_availability_lounge_id_date_band_key" UNIQUE (lounge_id, date, band),
  CONSTRAINT "lounge_availability_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."lounge_availability"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."lounge_closures" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lounge_id"     text                     NOT NULL,
  "starts_on"     date                     NOT NULL,
  "ends_on"       date                     NOT NULL,
  "reason"        text                     NOT NULL,
  "reopens_label" text                     NOT NULL,
  "posted_on"     date                     NOT NULL,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lounge_closures_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."lounge_closures"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."lounge_images" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "lounge_id"  text                     NOT NULL,
  "url"        text                     NOT NULL,
  "caption"    text                     NOT NULL,
  "detail"     text,
  "position"   smallint                 NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lounge_images_lounge_id_position_key" UNIQUE (lounge_id, "position"),
  CONSTRAINT "lounge_images_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."lounge_images"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lounges"
  ADD COLUMN "address" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."lounges"
  ADD COLUMN "phone" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."lounges"
  ADD COLUMN "email" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."lounges"
  ADD COLUMN "website" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."lounges"
  ADD COLUMN "reception_note" text NOT NULL DEFAULT ''::text;

ALTER TABLE "public"."lounges"
  ADD COLUMN "weekly_hours" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "public"."lounges"
  ADD COLUMN "review_count" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."lounges"
  ADD COLUMN "capacity" integer NOT NULL DEFAULT 40;

ALTER TABLE "public"."lounges"
  ADD COLUMN "booking_restrictions" text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE "public"."lounge_availability"
  ADD CONSTRAINT "lounge_availability_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

ALTER TABLE "public"."lounge_closures"
  ADD CONSTRAINT "lounge_closures_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

ALTER TABLE "public"."lounge_images"
  ADD CONSTRAINT "lounge_images_lounge_id_fkey" FOREIGN KEY (lounge_id) REFERENCES public.lounges(id) ON DELETE CASCADE;

CREATE POLICY "select lounge availability" ON "public"."lounge_availability"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "select lounge closures" ON "public"."lounge_closures"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "select lounge images" ON "public"."lounge_images"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lounge_availability" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lounge_closures" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lounge_images" TO "anon", "authenticated", "postgres", "service_role";
