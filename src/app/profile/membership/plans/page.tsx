"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { UpgradeConfirmModal } from "@/components/membership/upgrade-confirm-modal";
import { formatUsd } from "@/components/membership/plan-summary-card";
import { AccountShell } from "@/components/patterns/account-shell";
import { Button } from "@/components/ui/button";
import { ComparisonTable } from "@/components/ui/comparison-table";
import {
  ANNUAL_PRICE,
  ANNUAL_SAVINGS,
  MONTHLY_ANNUALIZED_PRICE,
  MONTHLY_PRICE,
  NAOMI_MEMBERSHIP,
  PLAN_COMPARISON_ROWS,
  type PlanId,
} from "@/lib/membership";

/**
 * Story 9.1 — "Compare plans" (`Plans.dc.html`). El plan "actual" (borde
 * dorado, chip "Your plan" y botón inerte) se decide por `?plan=` — la
 * misma anatomía de card sirve a los dos casos, solo cambia cuál de las dos
 * la lleva.
 */
export default function PlansPage() {
  return (
    <React.Suspense>
      <PlansScreen />
    </React.Suspense>
  );
}

function PlansScreen() {
  const searchParams = useSearchParams();
  const currentPlan: PlanId = searchParams.get("plan") === "monthly" ? "monthly" : "annual";
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  return (
    <AccountShell
      active="membership"
      breadcrumb={["Membership", "Compare plans"]}
      topbarRight={null}
      member={
        currentPlan === "monthly"
          ? { name: NAOMI_MEMBERSHIP.memberName, initials: NAOMI_MEMBERSHIP.initials, tier: "Monthly member" }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <Link
          href={currentPlan === "monthly" ? "/profile/membership?plan=monthly" : "/profile/membership"}
          aria-label="Back to Membership"
          className="flex size-8.5 items-center justify-center rounded-[10px] border-[1.5px] border-line bg-surface"
        >
          <ChevronLeft size={16} strokeWidth={1.9} className="text-fg-muted" aria-hidden />
        </Link>
        <h1 className="m-0 text-[34px] text-fg">Compare plans</h1>
      </div>
      <p className="m-0 ml-11.5 mt-1.5 text-[13.5px] text-fg-muted">
        The same access either way. What changes is how often you pay — and what it adds up to.
      </p>

      <div className="mt-5.5 grid grid-cols-2 gap-4.5">
        <PlanCard
          label="Monthly"
          price={formatUsd(MONTHLY_PRICE)}
          periodLabel="a month"
          note={`${formatUsd(MONTHLY_ANNUALIZED_PRICE)} over twelve months`}
          description="Charged on the same day each month. Cancel or pause before the next charge and it simply stops."
          isCurrent={currentPlan === "monthly"}
          actionLabel="Switch to monthly"
          effectNote="Takes effect on November 3"
        />
        <PlanCard
          label="Annual"
          price={formatUsd(ANNUAL_PRICE)}
          periodLabel="a year"
          note={
            <>
              $200.00 a month, billed once · <span className="font-bold text-accent-strong">saves {formatUsd(ANNUAL_SAVINGS)}</span>
            </>
          }
          description="One charge a year, and the rate is held for the whole term even if prices change."
          isCurrent={currentPlan === "annual"}
          actionLabel="Switch to annual"
          effectNote="Renews November 3, 2026"
          onSwitch={currentPlan === "monthly" ? () => setUpgradeOpen(true) : undefined}
        />
      </div>

      <ComparisonTable
        className="mt-3.5"
        leadingLabel="What you get"
        columns={[{ label: "Monthly" }, { label: "Annual", highlight: true }]}
        rows={PLAN_COMPARISON_ROWS.map((row) => ({ label: row.label, values: [row.monthly, row.annual], isTotal: row.isTotal }))}
      />

      <p className="m-0 mt-3.5 text-[11.5px] leading-[1.55] text-fg-subtle">
        Moving to annual takes effect straight away and credits the days you have already paid for. Moving to
        monthly waits until your current term ends, so nothing you paid for is lost.
      </p>

      <UpgradeConfirmModal open={upgradeOpen} onOpenChange={setUpgradeOpen} onConfirm={() => {}} />
    </AccountShell>
  );
}

function PlanCard({
  label,
  price,
  periodLabel,
  note,
  description,
  isCurrent,
  actionLabel,
  effectNote,
  onSwitch,
}: {
  label: string;
  price: string;
  periodLabel: string;
  note: React.ReactNode;
  description: string;
  isCurrent: boolean;
  actionLabel: string;
  effectNote: string;
  /** Sin handler, el botón queda inerte — solo "Switch to monthly" desde el anual (sin artboard de confirmación). */
  onSwitch?: () => void;
}) {
  return (
    <div
      className={
        isCurrent
          ? "rounded-content border-[1.5px] border-accent bg-surface p-5.5 shadow-ring"
          : "rounded-content border border-line bg-surface p-5.5 shadow-content"
      }
    >
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">{label}</p>
        {isCurrent ? (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-bold text-fg">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            Your plan
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-display text-[34px] text-fg">{price}</span>
        <span className="text-[13px] text-fg-muted">{periodLabel}</span>
      </div>
      <p className="m-0 mt-1.5 text-[12.5px] text-fg-subtle">{note}</p>

      <div className="my-4 h-px bg-line" />

      <p className="m-0 text-[12.5px] leading-[1.6] text-fg-muted">{description}</p>

      {isCurrent ? (
        <button
          type="button"
          disabled
          className="mt-4 h-[46px] w-full cursor-default rounded-control border border-line bg-blush-1 text-[12.5px] font-bold uppercase tracking-[0.1em] text-fg-subtle"
        >
          Current plan
        </button>
      ) : (
        <Button variant="secondary" size="lg" block className="mt-4 h-[46px]" type="button" onClick={onSwitch}>
          {actionLabel}
        </Button>
      )}
      <p className="m-0 mt-2.5 text-center text-[11.5px] text-fg-subtle">{effectNote}</p>
    </div>
  );
}
