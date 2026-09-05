"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { PARTNER_VENUE, guestCounts, PARTNER_GUESTS } from "@/lib/partner";

/**
 * Story 7.2 — "Morning digest email with day's guest list", sent at 6:30 AM.
 * DESIGN-SYSTEM.md §5 patrón 20 (email de marca). Artboard: EmailDigest.dc.html.
 */
const DIGEST_ROWS = [
  { arrival: "9:00 AM", name: "Marcus Ellery", reference: "LP-839014", note: "6th visit here" },
  { arrival: "9:00 AM", name: "Priya Raghunathan", reference: "LP-839221", note: "Quiet desk requested" },
  { arrival: "10:00 AM", name: "Theo Lindqvist", reference: "LP-840107", note: "3rd visit here" },
  { arrival: "10:30 AM", name: "Camille Duforest", reference: "LP-840388", note: "First visit" },
  { arrival: "11:00 AM", name: "Jonah Whitfield", reference: "LP-840512", note: "7th visit here" },
  { arrival: "12:00 PM", name: "Elena Vasquez", reference: "LP-841003", note: "Day pass · first visit" },
  { arrival: "12:30 PM", name: "Rowan Achebe", reference: "LP-841166", note: "5th visit here" },
  { arrival: "1:30 PM", name: "Sofia Marchetti", reference: "LP-841420", note: "Arriving with a laptop" },
] as const;

export default function MorningDigestEmailPage() {
  const counts = guestCounts(PARTNER_GUESTS);
  const remaining = counts.expected - DIGEST_ROWS.length;

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
              to frontdesk@theainsworth.com · Sep 14, 6:30 AM
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-fg">
            Morning digest
          </span>
        </div>
        <p className="m-0 border-b border-line px-6.5 pb-4.5 text-[15px] font-bold text-fg">
          Today at {PARTNER_VENUE.name} · {counts.expected} guests expected
        </p>

        <div data-theme="dark" className="surface-night dot-pattern relative px-8 py-5 text-center">
          <div className="relative">
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.16em] text-fg-subtle">
              {PARTNER_VENUE.dateLabel}
            </p>
            <h2 className="mt-2.5 font-display text-[30px] text-fg">{counts.expected} guests expected</h2>
          </div>
        </div>

        <div className="px-8 py-5">
          <p className="m-0 text-sm leading-[1.6] text-fg-muted">
            Good morning. Here is the day as it stands at 6:30 AM — anything booked after this
            shows up in the dashboard and in its own note.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <DigestTile value="3 – 4 PM" note="Busiest hour · 3 arrivals expected" />
            <DigestTile value="4 guests" note="Have been here before" />
            <DigestTile value="2 day passes" note="The other 12 are on memberships" />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-blush-2">
            <div className="grid grid-cols-[86px_1fr_108px_176px] gap-3 px-4 py-2.5">
              <Th>Arrival</Th>
              <Th>Guest</Th>
              <Th>Reference</Th>
              <Th>Worth knowing</Th>
            </div>
            {DIGEST_ROWS.map((row) => (
              <div
                key={row.reference}
                className="grid grid-cols-[86px_1fr_108px_176px] gap-3 border-t border-line px-4 py-2.5 text-[12.5px]"
              >
                <span className="font-bold text-fg">{row.arrival}</span>
                <span className="text-fg">{row.name}</span>
                <span className="text-fg-muted">{row.reference}</span>
                <span className="text-fg-muted">{row.note}</span>
              </div>
            ))}
          </div>
          <p className="m-0 mt-2.5 text-center text-xs font-bold text-accent-strong">
            {remaining} more, from 2:00 PM to 6:00 PM — open the full list
          </p>

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
              <Download size={16} strokeWidth={1.8} aria-hidden />
              Download CSV
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-line bg-blush-1 p-4">
            <p className="m-0 text-xs leading-[1.5] text-fg-muted">
              The digest goes out every morning at 6:30 AM local time. Change the hour, or add a
              colleague to it, under Settings → Notifications.
            </p>
          </div>
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

function Th({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle">{children}</p>
  );
}

function DigestTile({ value, note }: { value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <p className="m-0 text-[19px] font-extrabold text-fg">{value}</p>
      <p className="m-0 mt-1 text-[11.5px] text-fg-subtle">{note}</p>
    </div>
  );
}
