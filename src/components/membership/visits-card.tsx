import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { ConsumptionBar } from "@/components/ui/consumption-bar";
import { EXTRA_VISIT_PRICE_LABEL, type MembershipAccount } from "@/lib/membership";

/**
 * "Visits this month" — `Main.dc.html` (`variant="full"`, con el aviso de day
 * passes complementarios, solo si hay alguno real) y `MonthlyPlan.dc.html`
 * (`variant="compact"`, fila más corta sin ese aviso).
 */
export function VisitsCard({
  account,
  variant = "full",
}: {
  account: MembershipAccount;
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-5.5 rounded-content border border-line bg-surface p-4.5 shadow-content">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Visits this month</p>
          <p className="m-0 mt-1 text-xs leading-[1.5] text-fg-subtle">
            The same {account.visitsIncluded} either way — the plan changes what you pay, not what you get.
          </p>
        </div>
        <div className="w-[210px] shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl text-fg">{account.visitsUsed}</span>
            <span className="text-[12.5px] text-fg-muted">of {account.visitsIncluded} used</span>
            <span className="flex-1" />
            <span className="text-[11.5px] text-fg-subtle">{account.visitsResetLabel}</span>
          </div>
          <div className="mt-2 h-[9px] overflow-hidden rounded-pill bg-blush-1">
            <div
              className="h-full rounded-pill bg-accent"
              style={{ width: `${Math.min(100, (account.visitsUsed / account.visitsIncluded) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-content border border-line bg-surface p-5.5 shadow-content">
      <div className="flex items-baseline justify-between">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Visits this month</p>
        <span className="text-xs text-fg-subtle">{account.visitsResetLabel}</span>
      </div>

      <ConsumptionBar
        used={account.visitsUsed}
        included={account.visitsIncluded}
        unitLabel={`of ${account.visitsIncluded} included visits used`}
        className="mt-2.5"
      />

      {account.complimentaryDayPassesCount > 0 ? (
        <div className="mt-3.5 flex items-center gap-2.5 rounded-[12px] border border-line bg-blush-2 px-3.5 py-3">
          <CalendarClock size={18} strokeWidth={1.7} className="text-accent-strong" aria-hidden />
          <p className="m-0 flex-1 text-[12.5px] text-fg-muted">
            <span className="font-bold text-fg">
              {account.complimentaryDayPassesCount === 1
                ? "1 complimentary day pass"
                : `${account.complimentaryDayPassesCount} complimentary day passes`}
            </span>{" "}
            available — {account.complimentaryDayPassesNote}
          </p>
          <Link href="/profile/membership/referrals" className="text-[12.5px] font-bold text-accent-strong">
            View
          </Link>
        </div>
      ) : null}

      <p className="m-0 mt-2.5 text-[11.5px] leading-[1.55] text-fg-subtle">
        Extra visits beyond the {account.visitsIncluded} are charged as a day pass — {EXTRA_VISIT_PRICE_LABEL} plus tax.
      </p>
    </div>
  );
}
