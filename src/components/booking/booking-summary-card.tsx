import Link from "next/link";
import { Calendar, Clock, CreditCard, UserRound, type LucideIcon } from "lucide-react";

import { useBooking } from "./booking-context";
import { Card } from "@/components/ui/card";
import { ADMISSION_COUNT, NEW_CARD_OPTION_ID, SAMPLE_PAYMENT_METHODS } from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";

/**
 * Story 4.1 — "Booking summary before confirmation" (`Summary.dc.html`).
 * Grid de 2 columnas con Date/Arrival/Admission/Payment (icono + eyebrow +
 * valor + "Edit", salvo Admission) y la fila de peticiones especiales.
 */
function paymentLabel(paymentMethodId: string | null): string {
  if (paymentMethodId === null) return "Not selected";
  if (paymentMethodId === NEW_CARD_OPTION_ID) return "New card";

  const method = SAMPLE_PAYMENT_METHODS.find((m) => m.id === paymentMethodId);
  if (!method) return "Not selected";

  return `${method.brand === "visa" ? "Visa" : "Mastercard"} ending in ${method.last4}`;
}

export function BookingSummaryCard() {
  const { lounge, draft } = useBooking();

  return (
    <Card variant="content" className="border border-line p-5.5">
      <h3 className="m-0 text-[22px] text-fg">Booking summary</h3>

      <div className="mt-4.5 grid grid-cols-2 gap-4">
        <SummaryField
          icon={Calendar}
          label="Date"
          value={draft.dateIso ? formatWeekdayDate(draft.dateIso) : "—"}
          editHref={`/lounges/${lounge.id}/book`}
        />
        <SummaryField
          icon={Clock}
          label="Arrival"
          value={draft.time ?? "—"}
          editHref={`/lounges/${lounge.id}/book`}
        />
        <SummaryField
          icon={UserRound}
          label="Admission"
          value={`${ADMISSION_COUNT} member`}
        />
        <SummaryField
          icon={CreditCard}
          label="Payment"
          value={paymentLabel(draft.paymentMethodId)}
          editHref={`/lounges/${lounge.id}/book/payment`}
        />
      </div>

      <div className="mt-4.5 border-t border-line pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-fg-subtle">
            Special requests
          </span>
          {draft.specialRequests ? (
            <Link
              href={`/lounges/${lounge.id}/book`}
              className="text-xs font-semibold text-accent-strong"
            >
              Edit
            </Link>
          ) : null}
        </div>
        <p className="m-0 mt-1.5 text-[13.5px] text-fg">
          {draft.specialRequests || "None"}
        </p>
      </div>
    </Card>
  );
}

function SummaryField({
  icon: Icon,
  label,
  value,
  editHref,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  editHref?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft">
        <Icon size={16} strokeWidth={1.7} className="text-accent-strong" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
            {label}
          </span>
          {editHref ? (
            <Link href={editHref} className="text-xs font-semibold text-accent-strong">
              Edit
            </Link>
          ) : null}
        </div>
        <p className="m-0 mt-0.5 truncate text-sm font-bold text-fg">{value}</p>
      </div>
    </div>
  );
}
