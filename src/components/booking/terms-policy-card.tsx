import { useBooking } from "./booking-context";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CANCELLATION_POLICY } from "@/lib/booking";

/**
 * Story 4.1 — "Terms and cancellation policy display: must acknowledge"
 * (`Summary.dc.html`). Panel scrolleable con la política y la casilla que
 * habilita el botón de confirmación.
 */
export function TermsPolicyCard() {
  const { draft, update } = useBooking();

  return (
    <Card variant="content" className="mt-4 border border-line p-5.5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="m-0 text-lg text-fg">Terms and cancellation policy</h3>
        <a href="#" className="text-xs font-semibold text-accent-strong">
          Read in full
        </a>
      </div>

      <div className="max-h-[118px] overflow-y-auto rounded-xl border border-line bg-blush-1 p-4">
        {CANCELLATION_POLICY.map((paragraph) => (
          <p key={paragraph} className="m-0 mb-2.5 text-[12.5px] leading-[1.55] text-fg-muted last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-4">
        <Checkbox
          checked={draft.acceptedTerms}
          onCheckedChange={(checked) => update({ acceptedTerms: checked })}
        >
          I have read and accept the booking terms and the cancellation policy.
        </Checkbox>
      </div>
    </Card>
  );
}
