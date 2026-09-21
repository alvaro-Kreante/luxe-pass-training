"use client";

import * as React from "react";
import { CircleCheck, CreditCard, Plus, Snowflake } from "lucide-react";

import { useBooking } from "./booking-context";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Notice } from "@/components/ui/notice";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import {
  MEMBERSHIP_ANNUAL_PRICE,
  MEMBERSHIP_RENEWAL_MONTH_DAY,
  MEMBERSHIP_VISITS_INCLUDED,
  NEW_CARD_OPTION_ID,
  SAMPLE_PAYMENT_METHODS,
  formatCurrency,
  formatWholeCurrency,
  pricingFor,
} from "@/lib/booking";
import {
  createCheckoutSession,
  listSavedPaymentMethods,
  removeSavedPaymentMethod,
  type SavedPaymentMethod,
} from "@/lib/stripe-payments";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 4.2 — Paso 2 "Payment method" (`Payment.dc.html`). Cuando la visita
 * está cubierta por la membresía, sustituye la lista de métodos por
 * `MembershipCovered.dc.html` — no hace falta pagar nada. Conectada a
 * Stripe real: las tarjetas guardadas y el formulario de tarjeta nueva
 * (`<PaymentElement>`) son reales — ver CLAUDE.md §Procesamiento de pagos.
 */
export function PaymentMethodForm() {
  const { covered } = useBooking();

  return covered ? <MembershipCoveredBody /> : <PayableBody />;
}

function PayableBody() {
  const {
    lounge,
    draft,
    update,
    checkoutSession,
    setCheckoutSession,
    setPaymentElementHost,
    paymentElementHeight,
  } = useBooking();
  const [methods, setMethods] = React.useState<SavedPaymentMethod[] | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    let active = true;

    listSavedPaymentMethods(supabase).then((fetched) => {
      if (!active) return;
      setMethods(fetched);
      if (draft.paymentMethodId === null) {
        const defaultMethod = fetched.find((method) => method.isDefault) ?? fetched[0];
        if (defaultMethod) update({ paymentMethodId: defaultMethod.id });
      }
    });

    return () => {
      active = false;
    };
    // Solo al montar: preselecciona el método por defecto una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wantsNewCard = draft.paymentMethodId === NEW_CARD_OPTION_ID;

  React.useEffect(() => {
    if (!wantsNewCard || !draft.dateIso || !draft.band || !draft.time) return;

    let active = true;

    const supabase = createClient();
    createCheckoutSession(supabase, {
      loungeId: lounge.id,
      dateIso: draft.dateIso,
      band: draft.band,
      slotTime: draft.time,
      specialRequests: draft.specialRequests,
      saveCard: draft.saveNewCard,
    }).then((session) => {
      if (active) setCheckoutSession(session);
    });

    return () => {
      active = false;
    };
    // `draft.saveNewCard` recrea la sesión con `setup_future_usage` correcto
    // si el miembro cambia de opinión sobre guardar la tarjeta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNewCard, draft.saveNewCard]);

  async function removeMethod(id: string) {
    const supabase = createClient();
    await removeSavedPaymentMethod(supabase, id);
    setMethods((prev) => prev?.filter((method) => method.id !== id) ?? null);
    if (draft.paymentMethodId === id) update({ paymentMethodId: null });
  }

  return (
    <>
      <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-fg-subtle">
        Choose how you want to pay. Nothing is charged on this step — you confirm and
        pay on the next one.
      </p>

      <p className="m-0 mb-2.5 mt-4.5 text-[15px] font-bold text-fg">Express checkout</p>
      <div className="grid grid-cols-2 gap-3">
        <ExpressCheckoutButton label="Apple Pay" />
        <ExpressCheckoutButton label="Google Pay" />
      </div>

      <div className="my-5 flex items-center gap-3.5">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
          or pay by card
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mb-2.5 flex items-center justify-between">
        <p className="m-0 text-[15px] font-bold text-fg">Saved cards</p>
        <div className="flex items-center gap-2">
          {["VISA", "MASTERCARD", "AMEX", "DISCOVER"].map((label) => (
            <span
              key={label}
              className="rounded-md border border-line px-2 py-1 text-[10.5px] font-bold tracking-[0.06em] text-fg-subtle"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Payment method">
        {(methods ?? []).map((method) => (
          <PaymentOptionRow
            key={method.id}
            selected={draft.paymentMethodId === method.id}
            onSelect={() => update({ paymentMethodId: method.id })}
            leading={<CardBrandBadge brand={method.brand} />}
            title={`${method.brand === "visa" ? "Visa" : method.brand === "mastercard" ? "Mastercard" : method.brand} ending in ${method.last4}`}
            subtitle={`Expires ${String(method.expMonth).padStart(2, "0")}/${String(method.expYear).slice(-2)}`}
            trailing={
              method.isDefault ? (
                <span className="shrink-0 rounded-pill bg-accent-soft px-3 py-1.5 text-[11.5px] font-bold text-fg">
                  Default
                </span>
              ) : (
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeMethod(method.id);
                  }}
                  className="shrink-0 text-xs font-semibold text-accent-strong"
                >
                  Remove
                </a>
              )
            }
          />
        ))}

        <PaymentOptionRow
          selected={wantsNewCard}
          onSelect={() => update({ paymentMethodId: NEW_CARD_OPTION_ID })}
          leading={
            <span className="flex h-[30px] w-11 shrink-0 items-center justify-center rounded-[7px] bg-blush-1">
              <Plus size={17} strokeWidth={1.9} className="text-fg-subtle" aria-hidden />
            </span>
          }
          title="Use a new card"
          subtitle="Credit or debit · entered on Stripe's secure form"
        />
      </div>

      {wantsNewCard ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          {/* Hueco vacío a propósito: el <PaymentElement> real vive siempre
              en StripeCheckoutBridge (BookLayout) y se posiciona encima de
              este div — nunca se renderiza aquí dentro, para no mover el
              iframe de padre (lo recargaría). Ver su comentario. */}
          <div
            ref={setPaymentElementHost}
            className="min-h-[360px]"
            style={paymentElementHeight ? { minHeight: paymentElementHeight } : undefined}
          >
            {!checkoutSession ? (
              <p className="m-0 text-[12.5px] text-fg-subtle">Loading Stripe&apos;s secure form…</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <Checkbox
          align="center"
          checked={draft.saveNewCard}
          onCheckedChange={(checked) => update({ saveNewCard: checked })}
        >
          Save this card for future bookings
        </Checkbox>
      </div>

      <Notice icon={<CreditCard size={18} strokeWidth={1.6} />} className="mt-5">
        <p className="m-0 text-[13px] font-bold text-fg">
          Payments are processed by Stripe
        </p>
        <p className="m-0 mt-1 leading-[1.55]">
          Card details are entered in Stripe&apos;s PCI DSS Level 1 environment and
          never reach LuxePass servers. A receipt is emailed after payment.
        </p>
      </Notice>
    </>
  );
}

function MembershipCoveredBody() {
  const pricing = pricingFor(true);
  const defaultMethod = SAMPLE_PAYMENT_METHODS.find((method) => method.isDefault)!;

  return (
    <>
      <p className="m-0 mt-3 text-[12.5px] leading-[1.55] text-fg-subtle">
        No payment method is needed for this visit. You confirm the booking on the
        next step.
      </p>

      <div className="mt-4 flex items-center gap-4.5 rounded-2xl border-[1.5px] border-accent bg-surface p-6 shadow-content">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-soft">
          <CircleCheck size={30} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
        </span>
        <div className="flex-1">
          <h3 className="m-0 text-[27px] text-fg">This visit is included</h3>
          <p className="m-0 mt-2 text-[13.5px] leading-[1.55] text-fg-muted">
            Your annual membership covers this booking, so nothing is charged today.
            You will still receive a confirmation email with your booking reference.
          </p>
        </div>
        <span className="shrink-0 text-[34px] font-extrabold text-fg">
          {formatCurrency(0)}
        </span>
      </div>

      <div className="mt-4.5 rounded-2xl border border-line bg-surface p-5.5">
        <div className="flex items-center justify-between">
          <p className="m-0 text-[15px] font-bold text-fg">Your membership</p>
          <a href="#" className="text-xs font-semibold text-accent-strong">
            Manage plan
          </a>
        </div>

        <div className="mt-4 flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
            <Snowflake size={20} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="m-0 text-[15px] font-bold text-fg">Annual · En Soleil</p>
            <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">
              Renews {MEMBERSHIP_RENEWAL_MONTH_DAY} · billed to{" "}
              {defaultMethod.brand === "visa" ? "Visa" : "Mastercard"} ending in{" "}
              {defaultMethod.last4}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="m-0 text-lg font-extrabold text-fg">
              {formatWholeCurrency(MEMBERSHIP_ANNUAL_PRICE)}
            </p>
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
              per year · tax included
            </p>
          </div>
        </div>

        <div className="mt-4.5 border-t border-line pt-4.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[13px] font-bold text-fg">
              Visits included this month
            </span>
            <span className="text-[13px] font-bold text-accent-strong">
              {pricing.visitsUsed} of {pricing.visitsIncluded} used
            </span>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: MEMBERSHIP_VISITS_INCLUDED }, (_, index) => (
              <span
                key={index}
                className="h-2 flex-1 rounded-full"
                style={{
                  background:
                    index < pricing.visitsUsed ? "var(--gold-500)" : "var(--border)",
                }}
              />
            ))}
          </div>
          <p className="m-0 mt-2.5 text-[11.5px] leading-[1.5] text-fg-subtle">
            This booking is visit {pricing.visitsUsed}. Once the{" "}
            {pricing.visitsIncluded} included visits are used, extra visits are
            charged as a {formatCurrency(75)} day pass plus tax.
          </p>
        </div>
      </div>

      <div className="mt-4.5 flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5">
        <CardBrandBadge brand={defaultMethod.brand} />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[13.5px] font-bold text-fg">
            {defaultMethod.brand === "visa" ? "Visa" : "Mastercard"} ending in{" "}
            {defaultMethod.last4} kept on file
          </p>
          <p className="m-0 mt-0.5 text-xs text-fg-subtle">
            Used for renewals and day passes. Stored by Stripe, never on LuxePass
            servers.
          </p>
        </div>
        <a href="#" className="shrink-0 text-xs font-semibold text-accent-strong">
          Change
        </a>
      </div>
    </>
  );
}

function ExpressCheckoutButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex h-[52px] items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-line bg-surface text-sm font-bold text-fg transition-colors duration-150 hover:bg-accent-soft"
    >
      {label}
    </button>
  );
}
