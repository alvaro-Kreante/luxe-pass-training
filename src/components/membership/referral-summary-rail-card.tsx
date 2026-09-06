import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ReferralCode } from "@/components/ui/referral-code";
import { cn } from "@/lib/utils";
import type { MembershipAccount } from "@/lib/membership";

/**
 * "Referrals" — rail de `Main.dc.html` (con la síntesis del progreso y el
 * botón "Open referrals") y de `MonthlyPlan.dc.html` (Naomi no ha enviado
 * ninguna, así que no hay progreso que resumir ni "Open referrals" que
 * abrir — ese artboard termina en la caja del código).
 */
export function ReferralSummaryRailCard({ account }: { account: MembershipAccount }) {
  const hasSent = account.referralsSentCount > 0;

  return (
    <div className="rounded-content border border-line bg-surface p-5 shadow-content">
      <div className="flex items-center justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Referrals</p>
        <span className="text-[11.5px] text-fg-subtle">
          {hasSent ? `${account.referralsSentCount} sent` : "None sent"}
        </span>
      </div>

      <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-fg-muted">
        {hasSent
          ? "2 friends joined with your code. 1 day pass is credited, 1 is still pending."
          : "Share your code and you each get a complimentary day pass when they join."}
      </p>

      <ReferralCode code={account.referralCode} className="mt-3.5" />

      {hasSent ? (
        <Link
          href="/profile/membership/referrals"
          className={cn(buttonVariants({ size: "md", block: true }), "mt-3")}
        >
          Open referrals
        </Link>
      ) : null}
    </div>
  );
}
