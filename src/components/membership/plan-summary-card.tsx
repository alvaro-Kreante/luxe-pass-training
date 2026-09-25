import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ANNUAL_PRICE, MONTHLY_PRICE, type MembershipAccount } from "@/lib/membership";

/**
 * "Current plan" — compartida por `Main.dc.html` (anual) y `MonthlyPlan.dc.html`
 * (mensual). Story 9.1 — "Clear membership display in profile (active/inactive)".
 * Sin membresía (el miembro nace así desde Epic 9) la misma card dice
 * "Inactive" y lleva a comparar planes para elegir uno — ningún artboard
 * dibuja ese estado, desviación documentada en COMPONENT-MAP.md.
 */
export function PlanSummaryCard({ account }: { account: MembershipAccount }) {
  if (account.status === "inactive") return <InactivePlanCard account={account} />;

  const isAnnual = account.plan === "annual";

  return (
    <div className="rounded-content border border-line bg-surface p-5.5 shadow-content">
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Current plan</p>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-bold text-fg">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Active
        </span>
      </div>

      <div className="mt-2.5 flex items-end gap-3.5">
        <h2 className="font-display text-[30px] text-fg">{isAnnual ? "Annual" : "Monthly"}</h2>
        <p className="m-0 mb-1.5 text-[13px] text-fg-subtle">Member since {account.memberSince}</p>
      </div>

      <div className="mt-3.5 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="m-0 text-[12.5px] text-fg-muted">{isAnnual ? "Billed once a year" : "Billed every month"}</p>
          <p className="m-0 mt-1 font-display text-[27px] text-fg">
            {isAnnual ? formatUsd(ANNUAL_PRICE) : formatUsd(MONTHLY_PRICE)}
          </p>
        </div>
        <Link href="/profile/membership/plans" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
          Compare plans
        </Link>
      </div>
    </div>
  );
}

function InactivePlanCard({ account }: { account: MembershipAccount }) {
  return (
    <div className="rounded-content border border-line bg-surface p-5.5 shadow-content">
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Current plan</p>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-blush-1 px-3 py-1 text-[11.5px] font-bold text-fg-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-fg-subtle" />
          Inactive
        </span>
      </div>

      <div className="mt-2.5 flex items-end gap-3.5">
        <h2 className="font-display text-[30px] text-fg">No active plan</h2>
        {account.memberSince ? (
          <p className="m-0 mb-1.5 text-[13px] text-fg-subtle">Member since {account.memberSince}</p>
        ) : null}
      </div>

      <div className="mt-3.5 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="m-0 text-[12.5px] text-fg-muted">Monthly or annual — the same access either way</p>
          <p className="m-0 mt-1 font-display text-[27px] text-fg">From {formatUsd(MONTHLY_PRICE)}</p>
        </div>
        <Link href="/profile/membership/plans" className={cn(buttonVariants({ variant: "secondary", size: "md" }))}>
          Compare plans
        </Link>
      </div>
    </div>
  );
}

export function formatUsd(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
