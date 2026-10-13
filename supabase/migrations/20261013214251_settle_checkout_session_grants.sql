SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."cancel_booking_of_failed_payment"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."cancel_booking_of_failed_payment"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."settle_checkout_session"(text, text, text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."settle_checkout_session"(text, text, text) FROM "authenticated";
