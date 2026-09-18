SET local check_function_bodies = off;

COMMENT ON EXTENSION "pg_net" IS NULL;

DROP EXTENSION "pg_net";

CREATE EXTENSION "pg_net" SCHEMA "extensions";

COMMENT ON EXTENSION "pg_net" IS 'Async HTTP';
