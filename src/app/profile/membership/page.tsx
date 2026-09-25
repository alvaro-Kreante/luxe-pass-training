"use client";

import * as React from "react";

import { AutoRenewModal } from "@/components/membership/auto-renew-modal";
import { BenefitsGrid } from "@/components/membership/benefits-grid";
import { BillingRailCard } from "@/components/membership/billing-rail-card";
import { PlanSummaryCard } from "@/components/membership/plan-summary-card";
import { ReferralSummaryRailCard } from "@/components/membership/referral-summary-rail-card";
import { RenewalRailCard } from "@/components/membership/renewal-rail-card";
import { UpgradeConfirmModal } from "@/components/membership/upgrade-confirm-modal";
import { UpgradeOfferCard } from "@/components/membership/upgrade-offer-card";
import { VisitsCard } from "@/components/membership/visits-card";
import { RequireSession } from "@/components/onboarding/require-session";
import { AccountShell, SavedIndicatorChip } from "@/components/patterns/account-shell";
import { fetchMembershipAccount, setMembershipAutoRenew, type MembershipAccount } from "@/lib/membership";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 9.1 — "Membership". Backend real (`memberships`, Stripe en modo
 * test). `Main.dc.html` cuando el plan es anual, `MonthlyPlan.dc.html`
 * cuando es mensual — el plan de verdad decide, ya no un `?plan=`. Sin
 * membresía (así nace un miembro desde Epic 9), la card de plan dice
 * "Inactive" y lleva a `/profile/membership/plans` para elegir uno.
 */
export default function MembershipPage() {
  return (
    <RequireSession>
      <MembershipScreen />
    </RequireSession>
  );
}

function tierLabel(account: MembershipAccount) {
  if (account.plan === "annual") return "Annual member";
  if (account.plan === "monthly") return "Monthly member";
  return "Member";
}

function MembershipScreen() {
  const supabase = React.useMemo(() => createClient(), []);
  const [account, setAccount] = React.useState<MembershipAccount | null>(null);
  const [autoRenewOpen, setAutoRenewOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setAccount(await fetchMembershipAccount(supabase));
  }, [supabase]);

  React.useEffect(() => {
    let active = true;
    fetchMembershipAccount(supabase).then((next) => {
      if (active) setAccount(next);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function changeAutoRenewal(next: boolean) {
    setAccount((current) => (current ? { ...current, autoRenewal: next } : current));
    await setMembershipAutoRenew(supabase, next);
  }

  const isActive = account?.status === "active";
  const isAnnual = account?.plan === "annual";

  return (
    <AccountShell
      active="membership"
      breadcrumb="Membership"
      topbarRight={<SavedIndicatorChip />}
      member={account ? { name: account.memberName, initials: account.initials, tier: tierLabel(account) } : undefined}
    >
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[34px] text-fg">Membership</h1>
          <p className="m-0 mt-1.5 text-[13.5px] text-fg-muted">Your plan, what it includes, and when it renews.</p>

          {account ? (
            <div className="mt-5 flex flex-col gap-3">
              <PlanSummaryCard account={account} />
              {!isActive ? (
                <BenefitsGrid />
              ) : isAnnual ? (
                <>
                  <VisitsCard account={account} variant="full" />
                  <BenefitsGrid />
                </>
              ) : (
                <>
                  <UpgradeOfferCard
                    paidUpToLabel={account.paidUpToLabel}
                    unusedDays={account.unusedDaysInTerm}
                    onSwitchToAnnual={() => setUpgradeOpen(true)}
                  />
                  <VisitsCard account={account} variant="compact" />
                </>
              )}
            </div>
          ) : null}
        </div>

        {account ? (
          <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
            {isActive ? (
              <>
                <RenewalRailCard
                  account={account}
                  autoRenewal={account.autoRenewal}
                  manageable={isAnnual}
                  onManageRenewal={() => setAutoRenewOpen(true)}
                  onTurnOn={() => changeAutoRenewal(true)}
                />
                <BillingRailCard account={account} />
              </>
            ) : null}
            <ReferralSummaryRailCard account={account} />
          </div>
        ) : null}
      </div>

      {account ? (
        <>
          <AutoRenewModal
            open={autoRenewOpen}
            onOpenChange={setAutoRenewOpen}
            account={account}
            onConfirmTurnOff={() => changeAutoRenewal(false)}
          />
          {upgradeOpen ? (
            <UpgradeConfirmModal
              open
              onOpenChange={setUpgradeOpen}
              plan="annual"
              visitsUsed={account.visitsUsed}
              visitsIncluded={account.visitsIncluded}
              onCompleted={load}
            />
          ) : null}
        </>
      ) : null}
    </AccountShell>
  );
}
