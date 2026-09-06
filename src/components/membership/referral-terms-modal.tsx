import { Modal } from "@/components/patterns/modal";
import { Button } from "@/components/ui/button";
import { REFERRAL_TERMS_CLAUSES, REFERRAL_TERMS_NUMBERS, REFERRAL_TERMS_VERSION_LABEL } from "@/lib/referrals";

/**
 * "Terms and conditions" — `Terms.dc.html`. Story 9.2 — "Referral bonus terms
 * and conditions". Reutiliza el `Modal` genérico (patrón 4): la nota de
 * versión va en `headerExtra`, bajo la descripción.
 */
export function ReferralTermsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Referral programme"
      title="Terms and conditions"
      width={640}
      headerExtra={<p className="m-0 mt-1.5 text-xs text-fg-subtle">{REFERRAL_TERMS_VERSION_LABEL}</p>}
      footer={
        <div className="flex items-center gap-3.5">
          <p className="m-0 flex-1 text-xs leading-[1.5] text-fg-subtle">
            Something not covered here? <a className="cursor-pointer font-bold text-accent-strong">Contact support</a>
          </p>
          <Button variant="outline" size="lg">
            Download
          </Button>
          <Button size="lg" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {REFERRAL_TERMS_NUMBERS.map((item) => (
          <div key={item.label} className="rounded-content border border-line bg-blush-2 p-3.5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{item.label}</p>
            <p className="m-0 mt-1.5 font-display text-[22px] text-fg">{item.value}</p>
            <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-2">
        {REFERRAL_TERMS_CLAUSES.map((clause) => (
          <div key={clause.title} className="border-t border-line py-3.5">
            <h3 className="m-0 mb-1.5 text-[15px] text-fg">{clause.title}</h3>
            <p className="m-0 text-[12.5px] leading-[1.6] text-fg-muted">{clause.body}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
