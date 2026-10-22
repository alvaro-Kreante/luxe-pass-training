"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ReceiptsTable } from "@/components/membership/receipts-table";
import { UpdateCardButton } from "@/components/membership/update-card-button";
import { RequireSession } from "@/components/onboarding/require-session";
import { AccountShell } from "@/components/patterns/account-shell";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import { fetchReceipts, type ReceiptsOverview } from "@/lib/billing";
import { billingCardFrom, fetchMembership, initialsOf, type BillingCard, type MemberMembership } from "@/lib/membership";
import { formatCurrency } from "@/lib/partner";
import { listSavedPaymentMethods } from "@/lib/stripe-payments";
import { createClient } from "@/lib/supabase/client";

/**
 * "Invoices and receipts" — `Receipts.dc.html` (Fase 9). Cada cobro real del
 * miembro (`payments`) con el recibo del cargo en Stripe; la tarjeta se
 * cambia en el Customer Portal de Stripe (`UpdateCardButton`).
 */
export default function ReceiptsPage() {
  return (
    <RequireSession>
      <ReceiptsScreen />
    </RequireSession>
  );
}

function ReceiptsScreen() {
  const supabase = React.useMemo(() => createClient(), []);
  const [overview, setOverview] = React.useState<ReceiptsOverview | null>(null);
  const [card, setCard] = React.useState<BillingCard | null>(null);
  const [membership, setMembership] = React.useState<MemberMembership | null>(null);
  const [memberName, setMemberName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetchReceipts(supabase),
      listSavedPaymentMethods(supabase).catch(() => []),
      fetchMembership(supabase),
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return null;
        const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        return (data as { full_name: string } | null)?.full_name ?? null;
      }),
    ]).then(([nextOverview, methods, nextMembership, name]) => {
      if (!active) return;
      setOverview(nextOverview);
      setCard(billingCardFrom(methods));
      setMembership(nextMembership);
      setMemberName(name);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const tier =
    membership?.status === "active" ? (membership.plan === "annual" ? "Annual member" : "Monthly member") : "Member";

  return (
    <AccountShell
      active="membership"
      breadcrumb={["Membership", "Invoices and receipts"]}
      topbarRight={null}
      member={memberName ? { name: memberName, initials: initialsOf(memberName), tier } : undefined}
    >
      {overview ? (
        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Link
                href="/profile/membership"
                aria-label="Back to Membership"
                className="flex size-8.5 items-center justify-center rounded-[10px] border-[1.5px] border-line bg-surface"
              >
                <ChevronLeft size={16} strokeWidth={1.9} className="text-fg-muted" aria-hidden />
              </Link>
              <h1 className="m-0 text-[34px] text-fg">Invoices and receipts</h1>
            </div>
            <p className="m-0 ml-11.5 mt-1.5 text-[13.5px] text-fg-muted">
              Every charge to your account. Each receipt opens on Stripe, ready to print or save.
            </p>

            <div className="mt-5">
              <ReceiptsTable receipts={overview.receipts} />
            </div>

            <p className="m-0 mt-3 text-[11.5px] leading-[1.55] text-fg-subtle">
              Visits covered by your membership or by a complimentary day pass are not charged, so they have no receipt.
            </p>
          </div>

          <div className="flex w-70 shrink-0 flex-col gap-3.5">
            <div className="rounded-content border border-line bg-surface p-5 shadow-content">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">This year</p>
              <p className="m-0 mt-2.5 font-display text-[30px] font-medium text-fg">{formatCurrency(overview.yearTotal)}</p>
              <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-fg-muted">
                {overview.yearChargeCount} {overview.yearChargeCount === 1 ? "charge" : "charges"} since January
                {overview.yearRefunded > 0 ? ` · ${formatCurrency(overview.yearRefunded)} refunded` : ""}.
              </p>
            </div>

            <div className="rounded-content border border-line bg-surface p-5 shadow-content">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Card on file</p>
              {card ? (
                <div className="mt-3.5 flex items-center gap-3">
                  <CardBrandBadge brand={card.brand} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[13px] font-bold text-fg">•••• {card.last4}</p>
                    <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Expires {card.expiry}</p>
                  </div>
                </div>
              ) : (
                <p className="m-0 mt-3.5 text-[12.5px] text-fg-muted">No card saved yet.</p>
              )}
              <UpdateCardButton className="mt-3.5 flex h-11 w-full items-center justify-center rounded-control border-[1.5px] border-line bg-surface text-[12.5px] font-bold uppercase tracking-[0.1em] text-fg-muted transition-colors duration-150 hover:bg-accent-soft disabled:opacity-60">
                Update card
              </UpdateCardButton>
              <p className="m-0 mt-3 text-[11.5px] leading-[1.55] text-fg-subtle">
                Opens Stripe&apos;s secure page. Card details never touch LuxePass.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
}
