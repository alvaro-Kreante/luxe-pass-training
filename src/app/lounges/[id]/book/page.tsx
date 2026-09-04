"use client";

import { Phone } from "lucide-react";

import { useBooking } from "@/components/booking/booking-context";
import { VisitDetailsForm } from "@/components/booking/visit-details-form";
import { VisitSummaryRail } from "@/components/booking/visit-summary-rail";
import { AppShell } from "@/components/patterns/app-shell";
import { StepFlowRail } from "@/components/patterns/step-flow-rail";
import { StatusChip } from "@/components/ui/status-chip";
import { contactFor } from "@/lib/lounge-profile";

/**
 * Story 4.1 — Seamless Booking Flow. Paso 1 de 3 "Visit details"
 * (`Main.dc.html`). DESIGN-SYSTEM.md §5 patrón 9.
 */
export default function BookPage() {
  const { lounge } = useBooking();
  const contact = contactFor(lounge);

  return (
    <AppShell padded={false}>
      <StepFlowRail
        lounge={lounge}
        backHref={`/lounges/${lounge.id}`}
        backLabel={`Back to ${lounge.name}`}
        address={`${lounge.neighborhood} · ${lounge.city} · ${contact.address}`}
        headerBadge={<StatusChip available>Accepting bookings</StatusChip>}
        topbarRight={
          <a
            href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-2 text-[12.5px] font-bold tracking-[0.04em] text-accent-strong"
          >
            <Phone size={16} strokeWidth={1.8} aria-hidden />
            Booking help
          </a>
        }
        stepCurrent={1}
        stepTotal={3}
        stepLabel="Visit details"
        rail={<VisitSummaryRail />}
      >
        <VisitDetailsForm />
      </StepFlowRail>
    </AppShell>
  );
}
