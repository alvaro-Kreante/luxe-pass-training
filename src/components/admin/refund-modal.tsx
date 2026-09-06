"use client";

import * as React from "react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { CardBrandBadge } from "@/components/ui/card-brand-badge";
import { DetailRow } from "@/components/ui/detail-row";
import { Input } from "@/components/ui/input";
import { PaymentOptionRow } from "@/components/ui/payment-option-row";
import { formatCurrency, MANAGER_APPROVAL_LIMIT } from "@/lib/admin";

export interface RefundCharge {
  title: string;
  amount: number;
  cardLabel: string;
  dateLabel: string;
  chargeId: string;
}

/**
 * Story 8.1 — "Refund processing interface". Artboard:
 * docs/design/epic-8-admin-support/Refund.dc.html. El límite de aprobación
 * de soporte ($100.00) lo fija `DESIGN-SYSTEM.md` §6 (Fase 8).
 */
export function RefundModal({
  open,
  onOpenChange,
  charge,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge: RefundCharge;
  onConfirm: (amount: number) => void;
}) {
  const [mode, setMode] = React.useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = React.useState("");

  const amount = mode === "full" ? charge.amount : Number(partialAmount) || 0;
  const needsManager = amount > MANAGER_APPROVAL_LIMIT;

  function confirm() {
    onConfirm(amount);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      dark
      width={620}
      eyebrow="Refund"
      title="Refund the no-show fee"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="normal-case" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex-1" />
          <p className="m-0 text-[11.5px] text-fg-subtle">
            {needsManager
              ? `Needs a manager over ${formatCurrency(MANAGER_APPROVAL_LIMIT)}`
              : `Refund approved by you · no manager needed under ${formatCurrency(MANAGER_APPROVAL_LIMIT)}`}
          </p>
          <Button onClick={confirm} disabled={amount <= 0}>
            Refund {formatCurrency(amount)}
          </Button>
        </div>
      }
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Charge to reverse</p>
      <div className="mt-2.5 flex items-center gap-3.5 rounded-2xl border border-line bg-panel-black px-4.5 py-4">
        <CardBrandBadge brand="visa" />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13.5px] font-bold text-fg">{charge.title}</p>
          <p className="m-0 mt-1.5 text-[11.5px] text-fg-subtle">
            {charge.dateLabel} · {charge.cardLabel} · {charge.chargeId}
          </p>
        </div>
        <p className="m-0 font-display text-2xl text-fg">{formatCurrency(charge.amount)}</p>
      </div>

      <p className="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">Amount</p>
      <div role="radiogroup" aria-label="Amount" className="flex flex-col gap-2.5">
        <PaymentOptionRow
          selected={mode === "full"}
          onSelect={() => setMode("full")}
          title={`Full refund — ${formatCurrency(charge.amount)}`}
          subtitle="The whole fee goes back to the card it came from"
        />
        <PaymentOptionRow
          selected={mode === "partial"}
          onSelect={() => setMode("partial")}
          title="Partial refund"
          subtitle={`Enter an amount up to ${formatCurrency(charge.amount)} — needs a manager over ${formatCurrency(MANAGER_APPROVAL_LIMIT)}`}
        />
      </div>

      {mode === "partial" ? (
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          max={charge.amount}
          step={0.01}
          aria-label="Partial refund amount"
          placeholder="0.00"
          value={partialAmount}
          onChange={(event) => setPartialAmount(event.target.value)}
          className="mt-3"
        />
      ) : null}

      <div className="mt-5 flex flex-col gap-3.5">
        <DetailRow
          icon={<span className="text-accent">✓</span>}
          text={
            <>
              <span className="font-bold text-fg">Remove the no-show from Camille&apos;s record</span>
              <br />
              It stops counting toward the three-in-twelve-months pause, and the visit goes back to her allowance.
            </>
          }
        />
        <DetailRow
          icon={<span className="text-accent">✓</span>}
          text={
            <>
              <span className="font-bold text-fg">Email her that the fee is reversed</span>
              <br />
              Sent from this case, with your reply above it.
            </>
          }
        />
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-gold-600 bg-panel-black px-4.5 py-4">
        <p className="m-0 text-xs leading-[1.55] text-fg-muted">
          Refunds go back to the original card through Stripe and take 5–10 business days to appear. This is written
          to the audit log under your name and cannot be undone from this console.
        </p>
      </div>
    </Modal>
  );
}
