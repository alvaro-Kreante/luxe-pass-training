import Link from "next/link";
import { FileText } from "lucide-react";

import { UpdateCardButton } from "@/components/membership/update-card-button";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import type { MembershipAccount } from "@/lib/membership";

/**
 * "Billing" — rail compartido entre `Main.dc.html` y `MonthlyPlan.dc.html`.
 * "Update" abre el Customer Portal de Stripe; "Invoices and receipts" lleva a
 * `/profile/membership/receipts` (`Receipts.dc.html`). La tarjeta es la
 * guardada de verdad en Stripe (la por defecto, o la primera) — sin
 * ninguna, lo dice.
 */
export function BillingRailCard({ account }: { account: MembershipAccount }) {
  return (
    <div className="rounded-content border border-line bg-surface p-5 shadow-content">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Billing</p>

      {account.billingCard ? (
        <div className="mt-3.5 flex items-center gap-3">
          <CardBrandBadge brand={account.billingCard.brand} />
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13px] font-bold text-fg">•••• {account.billingCard.last4}</p>
            <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">Expires {account.billingCard.expiry}</p>
          </div>
          <UpdateCardButton className="cursor-pointer text-[12.5px] font-bold text-accent-strong disabled:opacity-60">
            Update
          </UpdateCardButton>
        </div>
      ) : (
        <p className="m-0 mt-3.5 text-[12.5px] text-fg-muted">No card saved yet.</p>
      )}

      <div className="my-4 h-px bg-line" />

      <Link
        href="/profile/membership/receipts"
        className="-mx-2.5 flex items-center gap-2.5 rounded-nav px-2.5 py-2 transition-colors duration-150 hover:bg-blush-2"
      >
        <FileText size={17} strokeWidth={1.7} className="text-accent-strong" aria-hidden />
        <span className="flex-1 text-[13px] font-semibold text-fg-muted">Invoices and receipts</span>
        {account.invoiceCount ? <span className="text-[11.5px] text-fg-subtle">{account.invoiceCount}</span> : null}
        <span aria-hidden className="text-fg-subtle">
          ›
        </span>
      </Link>
    </div>
  );
}
