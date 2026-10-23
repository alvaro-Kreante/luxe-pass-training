SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."expire_finished_bookings"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."expire_finished_bookings"() FROM "authenticated";
