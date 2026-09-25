"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cake, ChevronLeft, ChevronRight, FileText, Timer, Users } from "lucide-react";

import { ReferralInvitationsTable } from "@/components/membership/referral-invitations-table";
import { ReferralShareModal } from "@/components/membership/referral-share-modal";
import { ReferralTermsModal } from "@/components/membership/referral-terms-modal";
import { AccountShell } from "@/components/patterns/account-shell";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/ui/metric-tile";
import { ReferralCode } from "@/components/ui/referral-code";
import { useCurrentMember } from "@/lib/current-member";
import { REFERRAL_CODE } from "@/lib/profile";
import { cn } from "@/lib/utils";
import {
  REFERRAL_CREDITED_NOTIFICATIONS,
  REFERRAL_INVITATION_EXPIRY_DAYS,
  referralViewState,
  type DayPassEntry,
  type ReferralViewStateId,
} from "@/lib/referrals";

const DAY_PASS_ICONS: Record<DayPassEntry["icon"], React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  referral: Users,
  birthday: Cake,
  pending: Timer,
};

/**
 * Story 9.2 — "Referral Program". `Referrals.dc.html` por defecto;
 * `?state=credited` alcanza `RewardCredited.dc.html` (Daniel Okonjo pasa a
 * "Day pass credited"), igual que `?state=` en `/my-pass/[reference]`.
 */
export default function ReferralsPage() {
  return (
    <React.Suspense>
      <ReferralsScreen />
    </React.Suspense>
  );
}

function ReferralsScreen() {
  const searchParams = useSearchParams();
  const state: ReferralViewStateId = searchParams.get("state") === "credited" ? "credited" : "default";
  const { invitations, stats, dayPasses } = referralViewState(state);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [termsOpen, setTermsOpen] = React.useState(false);
  const member = useCurrentMember();

  const memberFirstName = member.name.split(" ")[0];

  return (
    <AccountShell
      active="membership"
      breadcrumb={["Membership", "Referrals"]}
      topbarRight={null}
      notificationExtras={state === "credited" ? REFERRAL_CREDITED_NOTIFICATIONS : undefined}
    >
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
            <h1 className="m-0 text-[34px] text-fg">Referrals</h1>
          </div>
          <p className="m-0 ml-11.5 mt-1.5 text-[13.5px] text-fg-muted">
            Share your code. When a friend joins, you each get a complimentary day pass.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3.5">
            <MetricTile tone="light" label="Invitations sent" value={String(stats.sentCount)} note={stats.sentNote} />
            <MetricTile tone="light" label="Friends joined" value={String(stats.joinedCount)} note={stats.joinedNote} />
            <MetricTile
              tone="light"
              label="Day passes earned"
              value={String(stats.earnedCount)}
              note={stats.earnedNote}
              highlighted={state === "credited"}
            />
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-4.5 rounded-content border border-line bg-surface p-4.5 shadow-content">
            <HowItWorksStep step={1}>Send your code by message, email or a link.</HowItWorksStep>
            <HowItWorksStep step={2}>They sign up with it and their first payment settles.</HowItWorksStep>
            <HowItWorksStep step={3}>A day pass lands in each of your accounts within 48 hours.</HowItWorksStep>
          </div>

          <ReferralInvitationsTable invitations={invitations} className="mt-3.5" />

          <p className="m-0 mt-2.5 text-[11.5px] leading-[1.55] text-fg-subtle">
            Invitations stay open for {REFERRAL_INVITATION_EXPIRY_DAYS} days. We only show a friend&#39;s name and
            email here because you were the one who sent it.
          </p>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-3.5">
          <div className="rounded-content border border-line bg-surface p-5 shadow-content">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Your code</p>
            <ReferralCode code={REFERRAL_CODE} className="mt-3.5" />
            <p className="m-0 mt-2.5 truncate text-xs text-fg-muted">luxepass.co/join/{REFERRAL_CODE}</p>
            <Button size="lg" block className="mt-3.5" type="button" onClick={() => setShareOpen(true)}>
              Share your code
            </Button>
          </div>

          <div
            className={cn(
              "rounded-content border border-line bg-surface p-5 shadow-content",
              state === "credited" && "border-[1.5px] border-accent shadow-ring",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Your day passes</p>
              {state === "credited" ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-bold text-fg">
                  <span aria-hidden className="size-1.5 rounded-full bg-accent" />3 ready
                </span>
              ) : null}
            </div>

            <div className="mt-3.5 flex flex-col gap-3">
              {dayPasses.map((entry) => {
                const Icon = DAY_PASS_ICONS[entry.icon];
                return (
                  <div key={entry.id} className={cn("flex items-center gap-2.5", entry.pending && "opacity-60")}>
                    <span
                      className={cn(
                        "flex size-8.5 shrink-0 items-center justify-center rounded-[10px]",
                        entry.pending ? "border border-dashed border-fg-subtle bg-surface" : "bg-accent-soft",
                      )}
                    >
                      <Icon size={17} strokeWidth={1.7} className={entry.pending ? "text-fg-subtle" : "text-accent-strong"} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("m-0 text-[13px] font-bold", entry.pending ? "text-fg-muted" : "text-fg")}>{entry.title}</p>
                      <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">{entry.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-4 h-px bg-line" />

            <p className="m-0 text-xs leading-[1.55] text-fg-muted">
              Day passes sit on top of your 8 included visits and last as long as your membership does.
            </p>

            <button
              type="button"
              className={cn(
                buttonSecondaryClass,
              )}
            >
              Use a day pass
            </button>
          </div>

          <button
            type="button"
            aria-label="Referral terms"
            onClick={() => setTermsOpen(true)}
            className="flex items-center gap-2.5 rounded-content border border-line bg-surface p-4 text-left shadow-content transition-colors duration-150 hover:bg-blush-2"
          >
            <FileText size={18} strokeWidth={1.7} className="shrink-0 text-accent-strong" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-fg">Referral terms</span>
              <span className="mt-0.5 block text-[11.5px] text-fg-subtle">What counts, when it pays, the limits</span>
            </span>
            <ChevronRight size={15} strokeWidth={1.8} className="shrink-0 text-fg-subtle" aria-hidden />
          </button>
        </div>
      </div>

      <ReferralShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        memberFirstName={memberFirstName}
        code={REFERRAL_CODE}
      />
      <ReferralTermsModal open={termsOpen} onOpenChange={setTermsOpen} />
    </AccountShell>
  );
}

const buttonSecondaryClass =
  "mt-3.5 flex h-11 w-full items-center justify-center rounded-control border-[1.5px] border-line bg-surface text-[12.5px] font-bold uppercase tracking-[0.1em] text-fg-muted transition-colors duration-150 hover:border-accent";

function HowItWorksStep({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex size-7.5 shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-xs font-extrabold text-accent-strong">
        {step}
      </span>
      <p className="m-0 text-[12.5px] leading-[1.5] text-fg-muted">{children}</p>
    </div>
  );
}
