"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useBooking } from "@/components/booking/booking-context";
import { buttonVariants } from "@/components/ui/button";
import { TAX_RATE, bookingReferenceFromId, formatCurrency, pricingFor } from "@/lib/booking";
import { formatWeekdayDate } from "@/lib/lounge-profile";
import { useCurrentMember } from "@/lib/current-member";
import { cn } from "@/lib/utils";

/**
 * Story 4.2/5.1 — "Payment confirmation email receipt" (`Receipt.dc.html`).
 * DESIGN-SYSTEM.md §5 patrón 20 — email de marca, sin App shell. El email
 * real ya se envía de verdad (Database Webhook -> Edge Function
 * `send-booking-receipt` -> Brevo, ver `supabase/schemas/booking_receipts.sql`
 * y CLAUDE.md §Email de recibo de reserva); esta pantalla es su espejo
 * dentro de la app, alcanzable desde `/book/confirmed`, con el nombre/email
 * reales del miembro con sesión (`useCurrentMember`), igual que el email.
 */
export default function ReceiptPage() {
  const router = useRouter();
  const { lounge, covered, draft } = useBooking();
  const member = useCurrentMember();

  React.useEffect(() => {
    if (!draft.dateIso || !draft.time || !draft.bookingId) {
      router.replace(`/lounges/${lounge.id}/book`);
    }
  }, [draft.dateIso, draft.time, draft.bookingId, lounge.id, router]);

  if (!draft.dateIso || !draft.time || !draft.bookingId) return null;

  const reference = bookingReferenceFromId(draft.bookingId);
  const pricing = pricingFor(covered);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lounge.address)}`;

  return (
    <div className="surface-blush flex min-h-screen items-start justify-center px-6 py-8">
      <div className="w-full max-w-[660px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-panel">
        <div className="border-b border-line px-6.5 py-4.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-on-accent">
              ES
            </span>
            <div className="flex-1">
              <p className="m-0 text-[13.5px] font-bold text-fg">
                En Soleil · LuxePass{" "}
                <span className="font-medium text-fg-subtle">&lt;bookings@luxepass.co&gt;</span>
              </p>
              <p className="m-0 mt-0.5 text-xs text-fg-subtle">
                to {member.email}
              </p>
            </div>
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-fg">
              Receipt
            </span>
          </div>
          <p className="m-0 mt-3.5 text-[15px] font-bold text-fg">
            Your visit at {lounge.name} is confirmed — {reference}
          </p>
        </div>

        <div data-theme="dark" className="surface-night dot-pattern relative px-8 py-5 text-center">
          <div className="relative">
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
              Booking confirmed
            </p>
            <h2 className="mt-2.5 font-display text-[30px] text-fg">{reference}</h2>
          </div>
        </div>

        <div className="px-8 py-5">
          <p className="m-0 text-sm leading-[1.6] text-fg-muted">
            {member.name.split(" ")[0]}, your lounge visit is booked. Show the
            reference number above at reception — no printing needed.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-line bg-blush-2 p-4.5">
            <ReceiptField
              label="Lounge"
              value={lounge.name}
              detail={[lounge.partnerName, lounge.address, "Level 2"].filter(Boolean).join(" · ")}
            />
            <ReceiptField
              label="When"
              value={formatWeekdayDate(draft.dateIso)}
              detail={`Arrive ${draft.time} · stay up to 4 hours`}
            />
            <ReceiptField label="Admission" value={`1 member · ${member.name}`} />
            {draft.specialRequests ? (
              <ReceiptField label="Special requests" value={draft.specialRequests} />
            ) : null}
          </div>

          <div className="mt-4 flex gap-3">
            <span className={cn(buttonVariants({ size: "md" }), "flex-1 cursor-default")}>
              Add to calendar
            </span>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "secondary", size: "md" }), "flex-1")}
            >
              Get directions
            </a>
          </div>

          <p className="m-0 mb-2.5 mt-4.5 text-xs font-bold uppercase tracking-[0.1em] text-accent-strong">
            Payment receipt
          </p>

          {pricing.covered ? (
            <p className="m-0 text-[13px] text-fg-muted">
              Included in your membership · no charge for this visit.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <Row label="Day pass · 1 visit" value={formatCurrency(pricing.subtotal)} />
              <Row
                label={`Sales tax · NY ${(TAX_RATE * 100).toFixed(3)}%`}
                value={formatCurrency(pricing.tax)}
              />
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-sm font-bold text-fg">Total charged</span>
                <span className="text-xl font-extrabold text-fg">
                  {formatCurrency(pricing.total)}
                </span>
              </div>
              <p className="m-0 text-[11.5px] leading-[1.55] text-fg-subtle">
                Charged to Visa ending in 4242 · Receipt LP-RC-{reference.slice(3)} ·
                Processed by Stripe
              </p>
            </div>
          )}

          <p className="m-0 mt-4.5 text-xs leading-[1.6] text-fg-muted">
            Plans changed? Cancel free of charge until{" "}
            <strong className="text-fg">{formatWeekdayDate(draft.dateIso)}</strong> from My
            Pass. After that, half of the day pass is refunded.
          </p>
        </div>

        <div className="border-t border-line bg-blush-2 px-8 py-3.5 text-center">
          <p className="m-0 text-[11.5px] leading-[1.6] text-fg-subtle">
            En Soleil LuxePass · 445 Park Avenue, New York, NY 10022
            <br />
            <a href="#" className="font-semibold">
              Manage booking
            </a>{" "}
            ·{" "}
            <a href="#" className="font-semibold">
              Contact support
            </a>{" "}
            ·{" "}
            <a href="#" className="font-semibold">
              Email preferences
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ReceiptField({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
      <p className="m-0 mt-1 text-[13.5px] font-bold text-fg">{value}</p>
      {detail ? (
        <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-muted">{detail}</p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className="text-[13px] font-bold text-fg">{value}</span>
    </div>
  );
}
