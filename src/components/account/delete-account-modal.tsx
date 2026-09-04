"use client";

import * as React from "react";
import { Calendar, Clock, CreditCard, Pause, Ticket, Trash2 } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailRow } from "@/components/ui/detail-row";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SAMPLE_MEMBER } from "@/lib/member";
import { UPCOMING_BOOKINGS, LATE_CANCELLATION_FEE_LABEL } from "@/lib/passes";
import { ACCOUNT_DELETION_GRACE_DAYS, DELETE_ACCOUNT_CONFIRMATION_WORD } from "@/lib/profile";

/**
 * Story 6.3 — "Account deletion option with confirmation". `DeleteAccount.dc.html`:
 * declara lo que cancela, lo que cobra y los 30 días de gracia, y ofrece
 * pausar la membresía en su lugar.
 */
export function DeleteAccountModal({
  open,
  onOpenChange,
  onConfirmDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}) {
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const canDelete = acknowledged && confirmText.trim() === DELETE_ACCOUNT_CONFIRMATION_WORD;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAcknowledged(false);
      setConfirmText("");
    }
    onOpenChange(next);
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Delete your account?"
      description={`This ends the membership of ${SAMPLE_MEMBER.name} and everything attached to it.`}
      media={
        <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft">
          <Trash2 size={26} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
        </span>
      }
      footer={
        <div className="flex items-center gap-3">
          <p className="m-0 flex-1 text-xs leading-[1.5] text-fg-subtle">
            Export your data before you delete it — you cannot request it afterwards.
          </p>
          <Button variant="outline" size="md" onClick={() => handleOpenChange(false)}>
            Keep my account
          </Button>
          <Button size="md" disabled={!canDelete} onClick={onConfirmDelete}>
            Delete my account
          </Button>
        </div>
      }
    >
      <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">What happens</p>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <DetailRow
          icon={<CreditCard size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
          text="Your annual membership is cancelled. The rest of the term is not refunded."
        />
        <DetailRow
          icon={<Calendar size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
          text={
            <>
              <strong className="text-fg">{UPCOMING_BOOKINGS.length} upcoming bookings are cancelled</strong> — any
              inside the 24-hour window is charged the {LATE_CANCELLATION_FEE_LABEL} fee.
            </>
          }
        />
        <DetailRow
          icon={<Ticket size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
          text="Every pass stops working at once, including the visit you may be on today."
        />
        <DetailRow
          icon={<Clock size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />}
          text={
            <>
              Your data is erased after <strong className="text-fg">{ACCOUNT_DELETION_GRACE_DAYS} days</strong>. Sign
              in before then and everything comes back.
            </>
          }
        />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-content border border-line bg-surface p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
          <Pause size={16} strokeWidth={1.9} className="text-accent-strong" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-bold text-fg">Pause your membership instead</p>
          <p className="m-0 mt-1 text-xs text-fg-subtle">
            Stops the billing and keeps your history, your favorites and your referral code
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Checkbox checked={acknowledged} onCheckedChange={setAcknowledged}>
          I understand my upcoming bookings will be cancelled and the {LATE_CANCELLATION_FEE_LABEL} late
          cancellation fee will be charged.
        </Checkbox>
      </div>

      <Field label="Type DELETE to confirm" htmlFor="delete-confirm" className="mt-4 mb-0">
        <Input
          id="delete-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={DELETE_ACCOUNT_CONFIRMATION_WORD}
        />
      </Field>
    </Modal>
  );
}
