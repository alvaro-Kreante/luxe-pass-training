import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  CANCELLATION_TIME_LABEL,
  CANCELLED_GUEST_ID,
  WAITLIST_PROMOTED_GUEST,
  WAITLIST_PROMOTION_TIME_LABEL,
  findPartnerGuest,
  PARTNER_GUESTS,
} from "@/lib/partner";

/**
 * Story 7.2 — "Cancellation notifications with updated guest count" +
 * "waitlist promotion alerts". DESIGN-SYSTEM.md §5 patrón 20 (email de
 * marca). Ambos cambios llegan juntos, como ya cuenta el propio email.
 */
export default function CancellationEmailPage() {
  const cancelledGuest = findPartnerGuest(PARTNER_GUESTS, CANCELLED_GUEST_ID)!;

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
              to frontdesk@theainsworth.example · Sep 14, {WAITLIST_PROMOTION_TIME_LABEL}
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-fg">
            Cancellation
          </span>
        </div>
        <p className="m-0 border-b border-line px-6.5 pb-4.5 text-[15px] font-bold text-fg">
          Cancellation at {cancelledGuest.arrivalTime} — and the seat is already taken
        </p>

        <div data-theme="dark" className="surface-night dot-pattern relative px-8 py-5 text-center">
          <div className="relative">
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
              Guest count updated
            </p>
            <h2 className="mt-2.5 font-display text-[30px] text-fg">15 expected today</h2>
          </div>
        </div>

        <div className="px-8 py-5">
          <p className="m-0 text-sm leading-[1.6] text-fg-muted">
            A guest cancelled this afternoon and someone on the waitlist took the slot within two
            minutes. Both changes are already on your list — nothing needs doing.
          </p>

          <div className="mt-4 flex gap-4 rounded-2xl border border-dashed border-ink-400 bg-blush-1 p-4.5">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center rounded-pill border border-dashed border-ink-400 px-3 py-1.5 text-[11.5px] font-bold text-ink-400">
                Cancelled {CANCELLATION_TIME_LABEL}
              </span>
              <p className="m-0 mt-2.5 text-[15px] font-bold text-fg-muted">
                {cancelledGuest.name} · {cancelledGuest.arrivalTime} arrival
              </p>
              <p className="m-0 mt-1 text-xs text-ink-400">
                {cancelledGuest.id} · booked on September 11
              </p>
              <p className="m-0 mt-2 text-[12.5px] text-fg-muted">
                Cancelled inside the 24-hour window, so the flat fee applies to the member. Your
                attribution for the day is unaffected.
              </p>
            </div>
            <div className="w-[110px] shrink-0 border-l border-line pl-4 text-right">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">
                Count
              </p>
              <h3 className="mt-1 font-display text-[32px] text-fg-muted">14</h3>
              <p className="m-0 mt-1 text-[11px] text-ink-400">down from 15</p>
            </div>
          </div>

          <div className="mt-3 flex gap-4 rounded-2xl border border-accent bg-blush-2 p-4.5">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1.5 text-[11.5px] font-bold text-fg">
                <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
                Promoted from the waitlist {WAITLIST_PROMOTION_TIME_LABEL}
              </span>
              <p className="m-0 mt-2.5 text-[15px] font-bold text-fg">
                {WAITLIST_PROMOTED_GUEST.name} · {WAITLIST_PROMOTED_GUEST.arrivalTime} arrival
              </p>
              <p className="m-0 mt-1 text-xs text-fg-subtle">
                {WAITLIST_PROMOTED_GUEST.id} · waiting since 11:20 AM
              </p>
              <p className="m-0 mt-2 text-[12.5px] text-fg-muted">
                Confirmed automatically and told to arrive at {WAITLIST_PROMOTED_GUEST.arrivalTime}
                . First visit to The Ainsworth — a day pass, not a membership visit.
              </p>
            </div>
            <div className="w-[110px] shrink-0 border-l border-line pl-4 text-right">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-fg-subtle">
                Count
              </p>
              <h3 className="mt-1 font-display text-[32px] text-fg">15</h3>
              <p className="m-0 mt-1 text-[11px] text-fg-subtle">back to where you were</p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              href="/partner"
              className="flex flex-1 items-center justify-center rounded-control bg-accent py-3 text-[13px] font-bold uppercase tracking-[0.12em] text-on-accent"
            >
              Open today&apos;s list
            </Link>
            <span className="flex flex-1 cursor-default items-center justify-center rounded-[11px] border-[1.5px] border-line py-3 text-[12.5px] font-bold tracking-[0.06em] text-fg-muted">
              See the waitlist
            </span>
          </div>

          <p className="m-0 mt-4 text-xs leading-[1.55] text-fg-muted">
            You are told about every cancellation for your venue, and again when a waitlisted
            guest takes the slot. Manage recipients under Settings → Notifications.
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
