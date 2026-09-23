"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ScheduleMonthlyModal } from "@/components/membership/schedule-monthly-modal";
import { UpgradeConfirmModal } from "@/components/membership/upgrade-confirm-modal";
import { formatUsd } from "@/components/membership/plan-summary-card";
import { RequireSession } from "@/components/onboarding/require-session";
import { AccountShell } from "@/components/patterns/account-shell";
import { Button } from "@/components/ui/button";
import { ComparisonTable } from "@/components/ui/comparison-table";
import {
  ANNUAL_PRICE,
  ANNUAL_SAVINGS,
  MONTHLY_ANNUALIZED_PRICE,
  MONTHLY_PRICE,
  PLAN_COMPARISON_ROWS,
  cancelMembershipPlanChange,
  fetchMembership,
  fetchVisitsThisMonth,
  formatLongDate,
  formatMonthDay,
  initialsOf,
  scheduleMembershipPlanChange,
  type MemberMembership,
  type PlanId,
} from "@/lib/membership";
import { createClient } from "@/lib/supabase/client";

/**
 * Story 9.1 — "Compare plans" (`Plans.dc.html`), backend real. El plan
 * "actual" (borde dorado, chip "Your plan" y botón inerte) es el de
 * `memberships`. Sin membresía, ninguna card lo lleva y las dos ofrecen
 * "Choose …" — la elección de plan reutiliza esta pantalla (decisión de
 * producto, 23 sept 2026, sin artboard propio; ver COMPONENT-MAP.md).
 * Desde el anual, "Switch to monthly" programa el cambio para el final del
 * término (`ScheduleMonthlyModal`, sin cobro hoy) y "Keep annual" lo deshace.
 */
export default function PlansPage() {
  return (
    <RequireSession>
      <PlansScreen />
    </RequireSession>
  );
}

function PlansScreen() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [membership, setMembership] = React.useState<MemberMembership | null>(null);
  const [memberName, setMemberName] = React.useState<string | null>(null);
  const [visits, setVisits] = React.useState<{
    used: number;
    included: number;
  } | null>(null);
  const [choice, setChoice] = React.useState<PlanId | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetchMembership(supabase),
      fetchVisitsThisMonth(supabase),
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return null;
        const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        return (data as { full_name: string } | null)?.full_name ?? null;
      }),
    ]).then(([nextMembership, nextVisits, name]) => {
      if (!active) return;
      setMembership(nextMembership);
      setVisits(nextVisits);
      setMemberName(name);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const currentPlan = membership?.status === "active" ? membership.plan : null;
  const renewal = membership?.currentPeriodEnd ?? null;
  const monthlyScheduled = currentPlan === "annual" && membership?.pendingPlan === "monthly";

  async function reloadMembership() {
    setMembership(await fetchMembership(supabase));
  }

  const monthlyEffect =
    monthlyScheduled && renewal
      ? `Starts ${formatLongDate(renewal)}`
      : currentPlan === "annual" && renewal
        ? `Takes effect on ${formatMonthDay(renewal)}`
        : currentPlan === "monthly" && renewal
          ? `Next charge ${formatLongDate(renewal)}`
          : "Starts today";
  const annualEffect =
    monthlyScheduled && renewal
      ? `Ends ${formatLongDate(renewal)}`
      : currentPlan === "annual" && renewal
        ? `Renews ${formatLongDate(renewal)}`
        : currentPlan === "monthly"
          ? "Takes effect straight away"
          : "Starts today";

  return (
    <AccountShell
      active="membership"
      breadcrumb={["Membership", "Compare plans"]}
      topbarRight={null}
      member={
        memberName
          ? {
              name: memberName,
              initials: initialsOf(memberName),
              tier:
                currentPlan === "annual" ? "Annual member" : currentPlan === "monthly" ? "Monthly member" : "Member",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <Link
          href="/profile/membership"
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

      {membership ? (
        <div className="mt-5.5 grid grid-cols-2 gap-4.5">
          <PlanCard
            label="Monthly"
            price={formatUsd(MONTHLY_PRICE)}
            periodLabel="a month"
            note={`${formatUsd(MONTHLY_ANNUALIZED_PRICE)} over twelve months`}
            description="Charged on the same day each month. Cancel or pause before the next charge and it simply stops."
            isCurrent={currentPlan === "monthly"}
            actionLabel={monthlyScheduled ? "Switch scheduled" : currentPlan ? "Switch to monthly" : "Choose monthly"}
            actionDisabled={monthlyScheduled}
            effectNote={monthlyEffect}
            onSwitch={
              currentPlan === "annual"
                ? () => setScheduleOpen(true)
                : currentPlan
                  ? undefined
                  : () => setChoice("monthly")
            }
            secondaryAction={
              monthlyScheduled ? (
                <button
                  type="button"
                  className="mt-2 w-full text-center text-[12.5px] font-bold text-accent-strong"
                  onClick={async () => {
                    await cancelMembershipPlanChange(supabase);
                    await reloadMembership();
                  }}
                >
                  Keep annual
                </button>
              ) : null
            }
          />
          <PlanCard
            label="Annual"
            price={formatUsd(ANNUAL_PRICE)}
            periodLabel="a year"
            note={
              <>
                $200.00 a month, billed once ·{" "}
                <span className="font-bold text-accent-strong">saves {formatUsd(ANNUAL_SAVINGS)}</span>
              </>
            }
            description="One charge a year, and the rate is held for the whole term even if prices change."
            isCurrent={currentPlan === "annual"}
            actionLabel={currentPlan ? "Switch to annual" : "Choose annual"}
            effectNote={annualEffect}
            onSwitch={currentPlan === "annual" ? undefined : () => setChoice("annual")}
          />
        </div>
      ) : null}

      <ComparisonTable
        className="mt-3.5"
        leadingLabel="What you get"
        columns={[{ label: "Monthly" }, { label: "Annual", highlight: true }]}
        rows={PLAN_COMPARISON_ROWS.map((row) => ({
          label: row.label,
          values: [row.monthly, row.annual],
          isTotal: row.isTotal,
        }))}
      />

      <p className="m-0 mt-3.5 text-[11.5px] leading-[1.55] text-fg-subtle">
        Moving to annual takes effect straight away and credits the days you have already paid for. Moving to monthly
        waits until your current term ends, so nothing you paid for is lost.
      </p>

      {scheduleOpen && renewal ? (
        <ScheduleMonthlyModal
          open
          onOpenChange={setScheduleOpen}
          termEndIso={renewal}
          onConfirm={async () => {
            await scheduleMembershipPlanChange(supabase, "monthly");
            await reloadMembership();
          }}
        />
      ) : null}

      {choice ? (
        <UpgradeConfirmModal
          open
          onOpenChange={(open) => {
            if (!open) setChoice(null);
          }}
          plan={choice}
          visitsUsed={visits?.used}
          visitsIncluded={visits?.included}
          onCompleted={() => router.push("/profile/membership")}
        />
      ) : null}
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
  actionDisabled = false,
  effectNote,
  onSwitch,
  secondaryAction,
}: {
  label: string;
  price: string;
  periodLabel: string;
  note: React.ReactNode;
  description: string;
  isCurrent: boolean;
  actionLabel: string;
  /** "Switch scheduled" — el paso a mensual ya está programado. */
  actionDisabled?: boolean;
  effectNote: string;
  onSwitch?: () => void;
  /** "Keep annual" bajo la card mensual cuando el paso a mensual está programado. */
  secondaryAction?: React.ReactNode;
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
        <Button
          variant="secondary"
          size="lg"
          block
          className="mt-4 h-[46px]"
          type="button"
          disabled={actionDisabled}
          onClick={onSwitch}
        >
          {actionLabel}
        </Button>
      )}
      <p className="m-0 mt-2.5 text-center text-[11.5px] text-fg-subtle">{effectNote}</p>
      {secondaryAction}
    </div>
  );
}
