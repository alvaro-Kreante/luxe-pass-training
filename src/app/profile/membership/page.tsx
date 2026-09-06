"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { AutoRenewModal } from "@/components/membership/auto-renew-modal";
import { BenefitsGrid } from "@/components/membership/benefits-grid";
import { BillingRailCard } from "@/components/membership/billing-rail-card";
import { PlanSummaryCard } from "@/components/membership/plan-summary-card";
import { ReferralSummaryRailCard } from "@/components/membership/referral-summary-rail-card";
import { RenewalRailCard } from "@/components/membership/renewal-rail-card";
import { UpgradeConfirmModal } from "@/components/membership/upgrade-confirm-modal";
import { UpgradeOfferCard } from "@/components/membership/upgrade-offer-card";
import { VisitsCard } from "@/components/membership/visits-card";
import { AccountShell, SavedIndicatorChip } from "@/components/patterns/account-shell";
import { membershipAccountForPlan, type PlanId } from "@/lib/membership";

/**
 * Story 9.1 — "Membership". `Main.dc.html` (Alexandra, anual) por defecto;
 * `MonthlyPlan.dc.html` (Naomi, mensual) con `?plan=monthly` — dos estados
 * de la misma pantalla, igual que `?covered=1` en `/lounges/[id]/book`.
 */
export default function MembershipPage() {
  return (
    <React.Suspense>
      <MembershipScreen />
    </React.Suspense>
  );
}

function MembershipScreen() {
  const searchParams = useSearchParams();
  const plan: PlanId = searchParams.get("plan") === "monthly" ? "monthly" : "annual";
  const account = membershipAccountForPlan(plan);
  const isAnnual = plan === "annual";

  const [autoRenewal, setAutoRenewal] = React.useState(account.autoRenewal);
  const [autoRenewOpen, setAutoRenewOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  return (
    <AccountShell
      active="membership"
      breadcrumb="Membership"
      topbarRight={<SavedIndicatorChip />}
      member={isAnnual ? undefined : { name: account.memberName, initials: account.initials, tier: "Monthly member" }}
    >
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[34px] text-fg">Membership</h1>
          <p className="m-0 mt-1.5 text-[13.5px] text-fg-muted">Your plan, what it includes, and when it renews.</p>

          <div className="mt-5 flex flex-col gap-3">
            <PlanSummaryCard account={account} />
            {isAnnual ? (
              <>
                <VisitsCard account={account} variant="full" />
                <BenefitsGrid />
              </>
            ) : (
              <>
                <UpgradeOfferCard onSwitchToAnnual={() => setUpgradeOpen(true)} />
                <VisitsCard account={account} variant="compact" />
              </>
            )}
          </div>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <RenewalRailCard
            account={account}
            autoRenewal={autoRenewal}
            manageable={isAnnual}
            onManageRenewal={() => setAutoRenewOpen(true)}
          />
          <BillingRailCard account={account} />
          <ReferralSummaryRailCard account={account} />
        </div>
      </div>

      <AutoRenewModal
        open={autoRenewOpen}
        onOpenChange={setAutoRenewOpen}
        account={account}
        onConfirmTurnOff={() => setAutoRenewal(false)}
      />
      <UpgradeConfirmModal open={upgradeOpen} onOpenChange={setUpgradeOpen} onConfirm={() => {}} />
    </AccountShell>
  );
}
