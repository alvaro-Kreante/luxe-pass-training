"use client";

import * as React from "react";
import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { Check } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import { formatUsd } from "@/components/membership/plan-summary-card";
import { TODAY } from "@/lib/availability";
import {
  cardBrandLabel,
  chargeMembershipWithSavedCard,
  createMembershipCheckoutSession,
  fetchMembershipQuote,
  formatLongDate,
  formatShortDate,
  priceForPlan,
  waitForMembershipPlan,
  type MembershipQuote,
  type PlanId,
} from "@/lib/membership";
import { getStripe } from "@/lib/stripe-client";
import { listSavedPaymentMethods, type SavedPaymentMethod } from "@/lib/stripe-payments";
import { createClient } from "@/lib/supabase/client";

/**
 * "Confirm your new plan" — `Upgrade.dc.html`. Story 9.1 — "Upgrade options
 * to monthly subscribers and pricing (monthly → yearly price)".
 *
 * Backend real (Stripe en modo test, Edge Function
 * `stripe-membership-checkout`). El importe sale de `membership_change_quote`
 * (servidor), nunca de una constante del cliente. Dos usos:
 *   - Subida mensual → anual (el artboard): con la línea de crédito por los
 *     días no usados.
 *   - Alta desde una membresía inactiva (decisión de producto, 23 sept 2026,
 *     sin artboard propio): la misma anatomía sin línea de crédito y con
 *     "Pay … and join".
 * Con tarjeta guardada se usa esa ("The card already on your membership");
 * sin ella, el modal monta el `<PaymentElement>` de Stripe — una Checkout
 * Session propia, igual que `/book/payment` — y el plan se activa cuando el
 * webhook liquida el pago.
 *
 * Quien lo usa lo monta solo mientras está abierto, para que cada apertura
 * pida un presupuesto y (si hace falta) una Checkout Session nuevos.
 */
export function UpgradeConfirmModal({
  open,
  onOpenChange,
  plan,
  visitsUsed,
  visitsIncluded,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanId;
  visitsUsed?: number;
  visitsIncluded?: number;
  onCompleted: () => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [quote, setQuote] = React.useState<MembershipQuote | null>(null);
  const [card, setCard] = React.useState<SavedPaymentMethod | null | undefined>(undefined);
  const [session, setSession] = React.useState<{ clientSecret: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let active = true;

    Promise.all([fetchMembershipQuote(supabase, plan), listSavedPaymentMethods(supabase).catch(() => [])])
      .then(async ([nextQuote, methods]) => {
        if (!active) return;
        setQuote(nextQuote);
        const saved = methods.find((method) => method.isDefault) ?? methods[0] ?? null;
        setCard(saved);
        if (!saved) {
          const nextSession = await createMembershipCheckoutSession(supabase, { plan, saveCard: true });
          if (active) setSession(nextSession);
        }
      })
      .catch(() => {
        if (active) setError("We could not reach the payment service. Close this and try again in a moment.");
      });

    return () => {
      active = false;
    };
  }, [open, plan, supabase]);

  const isUpgrade = quote?.kind === "upgrade";
  const due = quote ? quote.dueCents / 100 : null;
  const actionLabel = due === null ? "Loading…" : `Pay ${formatUsd(due)} and ${isUpgrade ? "switch" : "join"}`;

  async function finish(ok: boolean, message: string | null) {
    if (!ok) {
      setError(message ?? "The payment did not go through. Try another card.");
      return;
    }
    const activated = await waitForMembershipPlan(supabase, plan);
    if (!activated) {
      setError("The payment went through, but the plan has not updated yet. Refresh in a moment.");
      return;
    }
    onOpenChange(false);
    onCompleted();
  }

  const body = (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={isUpgrade ? "Monthly → Annual" : plan === "annual" ? "Annual membership" : "Monthly membership"}
      title="Confirm your new plan"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {session ? (
            <NewCardPayButton label={actionLabel} disabled={!quote} onDone={finish} />
          ) : (
            <SavedCardPayButton
              label={actionLabel}
              disabled={!quote || !card}
              onPay={async () => {
                try {
                  const result = await chargeMembershipWithSavedCard(supabase, { plan, paymentMethodId: card!.id });
                  await finish(result.status === "succeeded", result.error);
                } catch {
                  await finish(false, "We could not reach the payment service. Try again in a moment.");
                }
              }}
            />
          )}
        </div>
      }
    >
      <div className="rounded-content border border-line bg-blush-2 px-4">
        <AmountRow
          label={
            quote
              ? `${plan === "annual" ? "Annual" : "Monthly"} membership · ${formatShortDate(quote.termStart)} – ${formatShortDate(
                  new Date(Date.parse(quote.termEnd) - 86400000).toISOString(),
                )}`
              : `${plan === "annual" ? "Annual" : "Monthly"} membership`
          }
          value={formatUsd(quote ? quote.chargeCents / 100 : priceForPlan(plan))}
        />
        {isUpgrade && quote ? (
          <>
            <div className="h-px bg-line" />
            <AmountRow
              label={`Credit for ${quote.creditDays} unused days on monthly`}
              value={`−${formatUsd(quote.creditCents / 100)}`}
              highlight
            />
          </>
        ) : null}
        <div className="h-px bg-line" />
        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm font-bold text-fg">Due today</span>
          <span className="font-display text-2xl text-fg">{due === null ? "—" : formatUsd(due)}</span>
        </div>
      </div>

      {card ? (
        <div className="mt-3.5 flex items-center gap-3 rounded-content border border-line p-3.5">
          <CardBrandBadge brand={card.brand} />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13px] font-bold text-fg">
              {cardBrandLabel(card.brand)} •••• {card.last4}
            </p>
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
              {isUpgrade ? "The card already on your membership" : "Your saved card"}
            </p>
          </div>
          <a className="cursor-pointer text-[12.5px] font-bold text-accent-strong">Change</a>
        </div>
      ) : session ? (
        <div className="mt-3.5">
          <PaymentElement />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="m-0 mt-3 text-[12.5px] font-semibold text-accent-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-fg-subtle">What changes</p>
        <div className="mt-2.5 flex flex-col gap-2.5">
          {isUpgrade ? (
            <>
              <ChangeRow>
                The monthly charge stops today. Your next charge is{" "}
                <span className="font-bold text-fg">
                  {formatUsd(priceForPlan("annual"))} on {quote ? formatLongDate(quote.termEnd) : "—"}
                </span>
                .
              </ChangeRow>
              {visitsUsed !== undefined && visitsIncluded !== undefined ? (
                <ChangeRow>
                  {currentMonthName()} carries over untouched — you have used {visitsUsed} of {visitsIncluded} visits
                  and the other {Math.max(0, visitsIncluded - visitsUsed)} stay yours.
                </ChangeRow>
              ) : null}
            </>
          ) : (
            <ChangeRow>
              Your membership starts today. Your next charge is{" "}
              <span className="font-bold text-fg">
                {formatUsd(priceForPlan(plan))} on {quote ? formatLongDate(quote.termEnd) : "—"}
              </span>
              .
            </ChangeRow>
          )}
          <ChangeRow>Your bookings, your pass and your referral code are unaffected.</ChangeRow>
        </div>
      </div>

      <p className="m-0 mt-4 text-[11.5px] leading-[1.55] text-fg-subtle">
        Charged securely through Stripe.{" "}
        {plan === "annual"
          ? "Annual terms renew once a year until you turn auto-renewal off."
          : "Monthly terms renew every month until you turn auto-renewal off."}
      </p>
    </Modal>
  );

  if (!session) return body;

  return (
    <CheckoutElementsProvider stripe={getStripe()} options={{ clientSecret: session.clientSecret }}>
      {body}
    </CheckoutElementsProvider>
  );
}

function currentMonthName() {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${TODAY}T00:00:00Z`));
}

function SavedCardPayButton({
  label,
  disabled,
  onPay,
}: {
  label: string;
  disabled: boolean;
  onPay: () => Promise<void>;
}) {
  const [paying, setPaying] = React.useState(false);
  return (
    <Button
      size="lg"
      className="flex-1"
      disabled={disabled || paying}
      onClick={async () => {
        setPaying(true);
        try {
          await onPay();
        } finally {
          setPaying(false);
        }
      }}
    >
      {label}
    </Button>
  );
}

/** Tarjeta nueva — solo aquí se puede llamar a `useCheckoutElements()` (exige el provider montado). */
function NewCardPayButton({
  label,
  disabled,
  onDone,
}: {
  label: string;
  disabled: boolean;
  onDone: (ok: boolean, message: string | null) => Promise<void>;
}) {
  const checkoutResult = useCheckoutElements();
  const [paying, setPaying] = React.useState(false);

  return (
    <Button
      size="lg"
      className="flex-1"
      disabled={disabled || paying || checkoutResult.type !== "success"}
      onClick={async () => {
        if (checkoutResult.type !== "success") return;
        setPaying(true);
        try {
          const result = await checkoutResult.checkout.confirm({ redirect: "if_required" });
          await onDone(result.type === "success", result.type === "success" ? null : result.error.message);
        } finally {
          setPaying(false);
        }
      }}
    >
      {label}
    </Button>
  );
}

function AmountRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className={highlight ? "text-[13px] font-bold text-accent-strong" : "text-[13px] font-bold text-fg"}>
        {value}
      </span>
    </div>
  );
}

function ChangeRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Check size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden />
      <p className="m-0 text-[12.5px] leading-[1.55] text-fg-muted">{children}</p>
    </div>
  );
}
