import { Check } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import { formatUsd } from "@/components/membership/plan-summary-card";
import { NAOMI_MEMBERSHIP, UPGRADE_PRORATION } from "@/lib/membership";

/**
 * "Confirm your new plan" — `Upgrade.dc.html`. Story 9.1 — "Upgrade options
 * to monthly subscribers and pricing (monthly → yearly price)". Solo aplica
 * al mensual de Naomi (subida inmediata con prorrateo); no hay pantalla
 * posterior dibujada, así que confirmar solo cierra el modal — igual que
 * `WaitlistModal`.
 */
export function UpgradeConfirmModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const card = NAOMI_MEMBERSHIP.billingCard;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Monthly → Annual"
      title="Confirm your new plan"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Pay {formatUsd(UPGRADE_PRORATION.dueToday)} and switch
          </Button>
        </div>
      }
    >
      <div className="rounded-content border border-line bg-blush-2 px-4">
        <AmountRow label={UPGRADE_PRORATION.newTermLabel} value={formatUsd(UPGRADE_PRORATION.newTermCharge)} />
        <div className="h-px bg-line" />
        <AmountRow
          label={UPGRADE_PRORATION.unusedDaysCreditLabel}
          value={`−${formatUsd(UPGRADE_PRORATION.unusedDaysCredit)}`}
          highlight
        />
        <div className="h-px bg-line" />
        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm font-bold text-fg">Due today</span>
          <span className="font-display text-2xl text-fg">{formatUsd(UPGRADE_PRORATION.dueToday)}</span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-3 rounded-content border border-line p-3.5">
        <CardBrandBadge brand={card.brand} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-bold text-fg">Mastercard •••• {card.last4}</p>
          <p className="m-0 mt-0.5 text-[11.5px] text-fg-subtle">The card already on your membership</p>
        </div>
        <a className="cursor-pointer text-[12.5px] font-bold text-accent-strong">Change</a>
      </div>

      <div className="mt-4.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-fg-subtle">What changes</p>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <ChangeRow>
            The monthly charge stops today. Your next charge is{" "}
            <span className="font-bold text-fg">{UPGRADE_PRORATION.nextChargeAfterLabel}</span>.
          </ChangeRow>
          <ChangeRow>
            September carries over untouched — {UPGRADE_PRORATION.visitsCarryOverLabel}.
          </ChangeRow>
          <ChangeRow>Your bookings, your pass and your referral code are unaffected.</ChangeRow>
        </div>
      </div>

      <p className="m-0 mt-4 text-[11.5px] leading-[1.55] text-fg-subtle">
        Charged securely through Stripe. Annual terms renew once a year until you turn auto-renewal off.
      </p>
    </Modal>
  );
}

function AmountRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className={highlight ? "text-[13px] font-bold text-accent-strong" : "text-[13px] font-bold text-fg"}>
        {value}
      </span>
    </div>
  );
}

function ChangeRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Check size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden />
      <p className="m-0 text-[12.5px] leading-[1.55] text-fg-muted">{children}</p>
    </div>
  );
}
