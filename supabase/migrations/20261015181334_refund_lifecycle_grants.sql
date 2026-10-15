SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."record_payment_refund"(text, integer, text, text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."record_payment_refund"(text, integer, text, text) FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."settle_payment_intent"(text, text) FROM "anon";

REVOKE ALL ON FUNCTION "public"."settle_payment_intent"(text, text) FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."undo_purchase_of_refunded_payment"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."undo_purchase_of_refunded_payment"() FROM "authenticated";
