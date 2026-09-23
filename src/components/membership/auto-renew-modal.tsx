import { CalendarClock, Clock, CreditCard } from "lucide-react";

import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import type { MembershipAccount } from "@/lib/membership";

/**
 * "Turn off auto-renewal?" — `AutoRenew.dc.html`. Story 9.1 — "Renewal date
 * and auto-renewal settings". El diálogo generaliza los tres tokens del
 * artboard (fecha de fin, visitas incluidas, código de referido) a partir de
 * la cuenta que lo abre, en vez de fijarlos al literal de Alexandra — mismo
 * criterio que ya usa `CancelBookingModal` con los datos de cada reserva.
 */
export function AutoRenewModal({
  open,
  onOpenChange,
  account,
  onConfirmTurnOff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: MembershipAccount;
  onConfirmTurnOff: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Auto-renewal"
      title="Turn off auto-renewal?"
      description={
        <>
          Nothing changes today. Your membership stays active until{" "}
          <span className="font-bold text-fg">{account.renewalOrChargeDateLabel}</span> — and then it ends.
        </>
      }
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              onConfirmTurnOff();
              onOpenChange(false);
            }}
          >
            Turn it off
          </Button>
          <Button size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
            Keep auto-renewal on
          </Button>
        </div>
      }
    >
      <div className="rounded-content border border-line bg-blush-2 px-4">
        <DetailRow
          icon={<CalendarClock size={18} strokeWidth={1.7} className="text-accent-strong" aria-hidden />}
          text={
            <>
              Your <span className="font-bold text-fg">{account.visitsIncluded} included visits a month</span> stop on{" "}
              {account.renewalOrChargeDateLabel}. After that, day passes are charged at the full rate.
            </>
          }
        />
        {account.complimentaryDayPassesCount > 0 ? (
          <>
            <div className="my-1 h-px bg-line" />
            <DetailRow
              icon={<CreditCard size={18} strokeWidth={1.7} className="text-accent-strong" aria-hidden />}
              text={
                <>
                  The{" "}
                  <span className="font-bold text-fg">
                    {account.complimentaryDayPassesCount === 1
                      ? "complimentary day pass"
                      : `${account.complimentaryDayPassesCount} complimentary day passes`}
                  </span>{" "}
                  you have not used expire with the membership.
                </>
              }
            />
          </>
        ) : null}
        <div className="my-1 h-px bg-line" />
        <DetailRow
          icon={<Clock size={18} strokeWidth={1.7} className="text-accent-strong" aria-hidden />}
          text="Any booking dated after that is cancelled at no charge, and we tell you which ones before you confirm."
        />
      </div>

      <div className="mt-4.5">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-fg-subtle">
          Or keep the membership and stop paying for a while
        </p>
        <div className="mt-2.5 flex cursor-pointer items-center gap-3 rounded-content border border-line bg-surface p-3.5 transition-colors duration-150 hover:border-accent">
          <span className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-accent-soft">
            <Clock size={18} strokeWidth={1.8} className="text-accent-strong" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-bold text-fg">Pause for up to 3 months</p>
            <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-subtle">
              Billing stops. Your history, your favorites and the code {account.referralCode} stay exactly as they are.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
