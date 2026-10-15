SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.record_payment_refund (
  p_payment_intent_id    text,
  p_refunded_total_cents integer,
  p_refund_id            text    DEFAULT NULL::text,
  p_reason               text    DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.payments p
    set refunded_amount_cents = greatest(coalesce(p.refunded_amount_cents, 0), p_refunded_total_cents),
        status = case
          when greatest(coalesce(p.refunded_amount_cents, 0), p_refunded_total_cents) >= p.amount_cents then 'refunded'
          else p.status
        end,
        refunded_at = now(),
        refund_reason = coalesce(p_reason, p.refund_reason),
        stripe_refund_id = coalesce(p_refund_id, p.stripe_refund_id),
        updated_at = now()
    where p.stripe_payment_intent_id = p_payment_intent_id
      and p.status in ('succeeded', 'refunded');
end;
$function$;

CREATE OR REPLACE FUNCTION public.settle_payment_intent (
  p_payment_intent_id text,
  p_outcome           text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if p_outcome not in ('succeeded', 'failed') then
    raise exception 'Invalid outcome %', p_outcome;
  end if;

  update public.payments p
    set status = p_outcome, updated_at = now()
    where p.stripe_payment_intent_id = p_payment_intent_id
      and p.status = 'pending';
end;
$function$;

CREATE OR REPLACE FUNCTION public.undo_purchase_of_refunded_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.booking_id is not null then
    update public.bookings b
      set status = 'cancelled', cancelled_at = now(), cancellation_fee_cents = null, updated_at = now()
      where b.id = new.booking_id
        and b.status in ('confirmed', 'waitlisted');
  end if;

  if new.membership_plan is not null then
    update public.memberships m
      set status = 'expired', updated_at = now()
      where m.member_id = new.member_id
        and m.status = 'active';
  end if;

  return new;
end;
$function$;

CREATE TRIGGER undo_purchase_of_refunded_payment
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (((new.status = 'refunded'::text) AND (old.status IS DISTINCT FROM 'refunded'::text)))
  EXECUTE FUNCTION public.undo_purchase_of_refunded_payment();

REVOKE ALL ON FUNCTION "public"."record_payment_refund"(text, integer, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."record_payment_refund"(text, integer, text, text) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."settle_payment_intent"(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."settle_payment_intent"(text, text) TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."undo_purchase_of_refunded_payment"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."undo_purchase_of_refunded_payment"() TO "postgres", "service_role";
