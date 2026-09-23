import { CalendarCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { cardBrandLabel, type MembershipAccount } from "@/lib/membership";

/**
 * "Renewal" (`Main.dc.html`) / "Next charge" (`MonthlyPlan.dc.html`) — rail
 * compartido. Story 9.1 — "Renewal date and auto-renewal settings".
 *
 * `manageable` es `false` para el plan mensual de Naomi: `AutoRenew.dc.html`
 * solo dibuja el diálogo de apagar la auto-renovación para el anual de
 * Alexandra (ver COMPONENT-MAP.md, desviación) — "Manage renewal" y el
 * `Switch` quedan inertes en ese caso, sin `onClick`.
 */
export function RenewalRailCard({
  account,
  autoRenewal,
  manageable,
  onManageRenewal,
  onTurnOn,
}: {
  account: MembershipAccount;
  autoRenewal: boolean;
  manageable: boolean;
  onManageRenewal: () => void;
  /** Volver a encenderla no tiene diálogo propio en ningún artboard — se guarda directamente. */
  onTurnOn: () => void;
}) {
  const isAnnual = account.plan === "annual";

  return (
    <div className="rounded-content border border-line bg-surface p-5 shadow-content">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
        {isAnnual ? "Renewal" : "Next charge"}
      </p>
      <h2 className="mt-2 font-display text-[27px] text-fg">{account.renewalOrChargeDateLabel}</h2>
      <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-fg-muted">
        {isAnnual ? "$2,400.00" : "$249.00"} will be charged to {cardLabel(account)}.
      </p>

      <div className="my-4 h-px bg-line" />

      <div className="flex items-center gap-3.5">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13.5px] font-bold text-fg">Auto-renewal</p>
          <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">
            {autoRenewal
              ? `On · renews ${isAnnual ? "for another year" : "every month"}`
              : `Off · ends ${account.renewalOrChargeDateLabel}`}
          </p>
        </div>
        <Switch
          checked={autoRenewal}
          label="Auto-renewal"
          onCheckedChange={(next) => {
            if (!manageable) return;
            if (next) onTurnOn();
            else onManageRenewal();
          }}
        />
      </div>

      {isAnnual ? (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-[12px] border border-line bg-blush-2 px-3.5 py-2.5">
          <CalendarCheck size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden />
          <p className="m-0 text-[11.5px] leading-[1.55] text-fg-muted">
            We email you on <span className="font-bold text-fg">{account.renewalNoticeDateLabel}</span> — a month before
            — so nothing renews unannounced.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={manageable ? onManageRenewal : undefined}
        className={cn(buttonVariants({ variant: "secondary", size: "md", block: true }), "mt-3.5")}
      >
        Manage renewal
      </button>
    </div>
  );
}

function cardLabel(account: MembershipAccount) {
  if (!account.billingCard) return "your card";
  return `${cardBrandLabel(account.billingCard.brand)} •••• ${account.billingCard.last4}`;
}
