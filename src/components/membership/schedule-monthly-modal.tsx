"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/components/membership/plan-summary-card";
import { MONTHLY_PRICE, formatLongDate, formatShortDate } from "@/lib/membership";

/**
 * "Confirm your new plan" para anual → mensual. Ningún artboard dibuja esta
 * confirmación: reutiliza la anatomía de `Upgrade.dc.html` (mismo criterio
 * que el alta desde una membresía inactiva, aceptado por el usuario), con la
 * regla que ya fija `Plans.dc.html`: "Moving to monthly waits until your
 * current term ends, so nothing you paid for is lost" — hoy no se cobra
 * nada; la renovación del término cobra ya el mensual.
 */
export function ScheduleMonthlyModal({
  open,
  onOpenChange,
  termEndIso,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fin del término anual actual — cuando empieza el mensual. */
  termEndIso: string;
  onConfirm: () => Promise<void>;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const lastAnnualDay = new Date(Date.parse(termEndIso) - 86400000).toISOString();
  const switchDate = formatLongDate(termEndIso);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Annual → Monthly"
      title="Confirm your new plan"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch {
                setError("We could not schedule the switch. Try again in a moment.");
              } finally {
                setSaving(false);
              }
            }}
          >
            Switch to monthly on {formatShortDate(termEndIso)}
          </Button>
        </div>
      }
    >
      <div className="rounded-content border border-line bg-blush-2 px-4">
        <AmountRow label={`Annual membership · until ${formatShortDate(lastAnnualDay)}`} value="Paid" />
        <div className="h-px bg-line" />
        <AmountRow
          label={`Monthly membership · from ${formatShortDate(termEndIso)}`}
          value={`${formatUsd(MONTHLY_PRICE)} a month`}
        />
        <div className="h-px bg-line" />
        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm font-bold text-fg">Due today</span>
          <span className="font-display text-2xl text-fg">{formatUsd(0)}</span>
        </div>
      </div>

      {error ? (
        <p role="alert" className="m-0 mt-3 text-[12.5px] font-semibold text-accent-strong">
          {error}
        </p>
      ) : null}

      <div className="mt-4.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-fg-subtle">What changes</p>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <ChangeRow>
            Nothing changes today. Your annual term, and everything it includes, runs until{" "}
            <span className="font-bold text-fg">{switchDate}</span>.
          </ChangeRow>
          <ChangeRow>
            From then you pay <span className="font-bold text-fg">{formatUsd(MONTHLY_PRICE)} a month</span>, charged to
            the card on your membership, until you turn auto-renewal off.
          </ChangeRow>
          <ChangeRow>Your bookings, your pass and your referral code are unaffected.</ChangeRow>
        </div>
      </div>

      <p className="m-0 mt-4 text-[11.5px] leading-[1.55] text-fg-subtle">
        You can keep the annual plan instead at any point before {switchDate}.
      </p>
    </Modal>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className="text-[13px] font-bold text-fg">{value}</span>
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
