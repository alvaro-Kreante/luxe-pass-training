SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."resend_booking_receipt"(uuid) FROM "anon";
