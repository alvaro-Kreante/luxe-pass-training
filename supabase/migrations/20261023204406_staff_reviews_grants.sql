SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."admin_lounge_reviews"(text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."partner_reviews"(text) FROM "anon";
