SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."admin_apply_lounge_draft"(text, jsonb) FROM "anon";

REVOKE ALL ON FUNCTION "public"."admin_apply_lounge_draft"(text, jsonb) FROM "authenticated";
