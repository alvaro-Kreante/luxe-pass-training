"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";

import {
  LIVE_BOOKING,
  LIVE_BOOKING_TIME_LABEL,
  PARTNER_GUESTS,
  PARTNER_VENUE,
  guestCounts,
} from "@/lib/partner";

/**
 * Story 7.2 — "Email notification for each new booking". DESIGN-SYSTEM.md §5
 * patrón 20 (email de marca), igual que `Receipt.dc.html` / `Reminder.dc.html`:
 * sin backend, se cubre visualmente con los mismos datos de `LIVE_BOOKING`
 * que anima la actualización en vivo de `/partner`.
 */
export default function NewBookingEmailPage() {
  const before = guestCounts(PARTNER_GUESTS);

  return (
    <div className="surface-blush flex min-h-screen items-start justify-center px-6 py-8">
      <div className="w-full max-w-[660px] overflow-hidden rounded-[20px] border border-line bg-surface shadow-panel">
        <div className="flex items-center gap-3 border-b border-line px-6.5 py-4.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[13px] font-bold text-on-accent">
            ES
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[13.5px] font-bold text-fg">
              En Soleil · LuxePass Partners{" "}
              <span className="font-medium text-fg-subtle">&lt;partners@luxepass.co&gt;</span>
            </p>
            <p className="m-0 mt-0.5 text-xs text-fg-subtle">
              to frontdesk@theainsworth.com · Sep 14, {LIVE_BOOKING_TIME_LABEL}
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-fg">
            New booking
          </span>
        </div>
        <p className="m-0 border-b border-line px-6.5 pb-4.5 text-[15px] font-bold text-fg">
          New booking · Tonight at {LIVE_BOOKING.arrivalTime} · {LIVE_BOOKING.name}
        </p>

        <div data-theme="dark" className="surface-night dot-pattern relative px-8 py-5 text-center">
          <div className="relative">
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
              One more for tonight
            </p>
            <h2 className="mt-2.5 font-display text-[30px] text-fg">
              Tonight, {LIVE_BOOKING.arrivalTime}
            </h2>
          </div>
        </div>

        <div className="px-8 py-5">
          <p className="m-0 text-sm leading-[1.6] text-fg-muted">
            A booking has just been made for today. It is already on your guest list — this note
            is so nobody has to be watching the screen.
          </p>

          <div className="mt-4 flex gap-4.5 rounded-2xl border border-line bg-blush-2 p-4.5">
            <div className="flex flex-1 flex-col gap-3.5">
              <EmailField
                label="Guest"
                value={LIVE_BOOKING.name}
                detail={`${LIVE_BOOKING.membershipLabel} · ${LIVE_BOOKING.visitLabel} to ${PARTNER_VENUE.name}`}
              />
              <EmailField
                label="Arrival"
                value={`${PARTNER_VENUE.dateLabel} · ${LIVE_BOOKING.arrivalTime}`}
                detail={`Admission window ${LIVE_BOOKING.admissionWindowLabel.toLowerCase()} · ${LIVE_BOOKING.admissionLabel}`}
              />
              <EmailField label="Contact" value={LIVE_BOOKING.email} detail={LIVE_BOOKING.phone} />
            </div>

            <div className="w-[170px] shrink-0 rounded-2xl border border-line bg-surface p-3.5 text-center">
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Reference
              </p>
              <h3 className="mt-1 font-display text-lg text-fg">{LIVE_BOOKING.id}</h3>
              <div className="my-3 h-px bg-line" />
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
                Expected today
              </p>
              <h3 className="mt-1 font-display text-[30px] text-fg">{before.expected + 1}</h3>
              <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">
                was {before.expected} · {before.arrived} checked in
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle">
              Note from the guest
            </p>
            <p className="m-0 mt-1.5 text-[13px] leading-[1.5] text-fg-muted">
              Celebrating a birthday — a quiet corner would be lovely if there is one free.
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              href="/partner"
              className="flex flex-1 items-center justify-center rounded-control bg-accent py-3 text-[13px] font-bold uppercase tracking-[0.12em] text-on-accent"
            >
              Open today&apos;s list
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex flex-1 items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line py-3 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted"
            >
              <Printer size={16} strokeWidth={1.8} aria-hidden />
              Print updated list
            </button>
          </div>

          <p className="m-0 mt-4 flex items-center gap-2 text-xs leading-[1.55] text-fg-muted">
            <Download size={13} strokeWidth={1.8} aria-hidden className="shrink-0" />
            One of these arrives for every booking made for your venue. Choose who on the team
            receives them under Settings → Notifications.
          </p>
        </div>

        <div className="border-t border-line bg-blush-2 px-8 py-3.5 text-center">
          <p className="m-0 text-[11.5px] leading-[1.6] text-fg-subtle">
            En Soleil LuxePass · 445 Park Avenue, New York, NY 10022
            <br />
            <a href="#" className="font-semibold">
              Open dashboard
            </a>{" "}
            ·{" "}
            <a href="#" className="font-semibold">
              Partner support
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

function EmailField({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p className="m-0 mt-1 text-[13.5px] font-bold text-fg">{value}</p>
      {detail ? <p className="m-0 mt-0.5 text-xs leading-[1.5] text-fg-muted">{detail}</p> : null}
    </div>
  );
}
