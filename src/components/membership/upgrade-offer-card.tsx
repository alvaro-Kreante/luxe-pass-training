import { CircleAlert, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ANNUAL_SAVINGS, MONTHLY_ANNUALIZED_PRICE, ANNUAL_PRICE } from "@/lib/membership";
import { formatUsd } from "@/components/membership/plan-summary-card";

/**
 * "Switch to annual" — card con borde dorado de `MonthlyPlan.dc.html`, solo
 * con plan mensual activo. Story 9.1 — "Upgrade options to monthly
 * subscribers and pricing (monthly → yearly price)". Fecha y días del aviso
 * salen del término real (`memberships`), no del literal del artboard.
 */
export function UpgradeOfferCard({
  paidUpToLabel,
  unusedDays,
  onSwitchToAnnual,
}: {
  paidUpToLabel: string;
  unusedDays: number;
  onSwitchToAnnual: () => void;
}) {
  return (
    <div className="rounded-content border-[1.5px] border-accent bg-surface p-5.5 shadow-ring">
      <div className="flex items-center gap-3">
        <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
          <TrendingUp size={19} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
        </span>
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">Switch to annual</p>
          <h2 className="mt-1 font-display text-[27px] text-fg">Save {formatUsd(ANNUAL_SAVINGS)} a year</h2>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <div className="rounded-[14px] border border-line bg-blush-2 p-3.5">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-fg-subtle">Staying monthly</p>
          <p className="m-0 mt-1.5 font-display text-2xl text-fg-muted">{formatUsd(MONTHLY_ANNUALIZED_PRICE)}</p>
          <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">$249.00 × 12 months</p>
        </div>
        <div className="rounded-[14px] border-[1.5px] border-accent bg-accent-soft p-3.5">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.06em] text-accent-strong">On annual</p>
          <p className="m-0 mt-1.5 font-display text-2xl text-fg">{formatUsd(ANNUAL_PRICE)}</p>
          <p className="m-0 mt-1 text-[11.5px] text-fg-muted">$200.00 a month, billed once</p>
        </div>
      </div>

      <div className="mt-3.5 flex items-start gap-2.5 rounded-[12px] border border-line bg-blush-2 px-3.5 py-3">
        <CircleAlert size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden />
        <p className="m-0 text-xs leading-[1.55] text-fg-muted">
          You are paid up to <span className="font-bold text-fg">{paidUpToLabel}</span>. Switching today credits the{" "}
          {unusedDays === 1 ? "1 day" : `${unusedDays} days`} you have not used, so nothing is lost.
        </p>
      </div>

      <Button type="button" size="lg" block className="mt-3.5" onClick={onSwitchToAnnual}>
        Switch to annual
      </Button>
    </div>
  );
}
