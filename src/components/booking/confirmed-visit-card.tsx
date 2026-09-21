import { useBooking } from "./booking-context";
import { toneOf } from "@/components/lounges/lounge-thumb";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { STAY_HOURS, formatCurrency, pricingFor } from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";

/**
 * Story 4.1 — pantalla de confirmación inmediata (`Confirmed.dc.html`).
 * Grid de 3 columnas: Date/Arrival/Admission, peticiones especiales a
 * ancho doble, y el pago realizado.
 */
export function ConfirmedVisitCard() {
  const { lounge, covered, draft } = useBooking();
  const pricing = pricingFor(covered);
  const paymentValue = pricing.covered
    ? "Included in your membership"
    : `Paid ${formatCurrency(pricing.total)} · Visa 4242`;

  return (
    <Card variant="content" className="border border-line p-5.5">
      <div className="flex items-center gap-3.5 border-b border-line pb-4.5">
        <span
          aria-hidden
          data-tone={toneOf(lounge.id)}
          className="lounge-hero size-13 shrink-0 rounded-xl"
        />
        <div className="flex-1">
          <h2 className="m-0 text-[22px] text-fg">{lounge.name}</h2>
          <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">
            {lounge.address} · {lounge.receptionNote}
          </p>
        </div>
        <StatusChip available>Confirmed</StatusChip>
      </div>

      <div className="grid grid-cols-3 gap-4.5 pt-4.5">
        <Field label="Date" value={draft.dateIso ? formatWeekdayDate(draft.dateIso) : "—"} />
        <Field label="Arrival" value={`${draft.time ?? "—"} · up to ${STAY_HOURS} hours`} />
        <Field label="Admission" value="1 member" />
        <div className="col-span-2">
          <Field
            label="Special requests"
            value={draft.specialRequests || "None"}
          />
        </div>
        <Field label="Payment" value={paymentValue} />
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
      <p className="m-0 mt-1.5 text-[13.5px] font-bold leading-[1.5] text-fg">{value}</p>
    </div>
  );
}
