CREATE TABLE "public"."lounges" (
  "id"              text                     NOT NULL,
  "name"            text                     NOT NULL,
  "neighborhood"    text                     NOT NULL,
  "city"            text                     NOT NULL,
  "city_id"         text                     NOT NULL,
  "lat"             double precision         NOT NULL,
  "lng"             double precision         NOT NULL,
  "amenities"       text[]                   NOT NULL DEFAULT '{}'::text[],
  "rating"          numeric(2,1)             NOT NULL DEFAULT 0,
  "open_now"        boolean                  NOT NULL DEFAULT true,
  "slots_today"     integer                  NOT NULL DEFAULT 0,
  "hours"           text                     NOT NULL,
  "bands"           text[]                   NOT NULL DEFAULT '{}'::text[],
  "closed_weekdays" smallint[]               NOT NULL DEFAULT '{}'::smallint[],
  "featured"        boolean                  NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "lounges_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."lounges"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select lounges" ON "public"."lounges"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."lounges" TO "anon", "authenticated", "postgres", "service_role";
